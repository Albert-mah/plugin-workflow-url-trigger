import { Context } from '@nocobase/actions';
import WorkflowPlugin, { Trigger, WorkflowModel, EXECUTION_STATUS, toJSON } from '@nocobase/plugin-workflow';

/**
 * Convert a glob pattern to a RegExp.
 *
 *   /admin/*      -> matches one path segment   (e.g. /admin/users)
 *   /admin/**     -> matches any depth           (e.g. /admin/a/b/c)
 *   /page/:id     -> named param style           (e.g. /page/123)
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0GLOBSTAR\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\0GLOBSTAR\0/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchUrl(pattern: string, mode: string, url: string): boolean {
  if (mode === 'regex') {
    return new RegExp(pattern).test(url);
  }
  // default: glob
  return globToRegex(pattern).test(url);
}

export default class UrlTrigger extends Trigger {
  static TYPE = 'url';

  constructor(workflow: WorkflowPlugin) {
    super(workflow);

    const self = this;

    // Register a Koa-level middleware to intercept every incoming request.
    // The middleware itself is lightweight — it only does real work when
    // there are enabled workflows of type "url" whose pattern matches.
    workflow.app.use(async function urlTriggerMiddleware(ctx: Context, next) {
      // Skip non-page requests early (static assets, healthcheck, etc.)
      const path: string = ctx.path;

      const matched = self.getMatchingWorkflows(path, ctx.method);
      if (!matched.length) {
        return next();
      }

      const syncWorkflows: Array<[WorkflowModel, any]> = [];
      const asyncWorkflows: Array<[WorkflowModel, any]> = [];

      const triggerContext = self.buildContext(ctx);

      for (const wf of matched) {
        if (self.workflow.isWorkflowSync(wf)) {
          syncWorkflows.push([wf, triggerContext]);
        } else {
          asyncWorkflows.push([wf, triggerContext]);
        }
      }

      // --- Sync workflows: run before the request proceeds ---
      for (const [wf, context] of syncWorkflows) {
        const processor = await self.workflow.trigger(wf, context, {
          httpContext: ctx,
        });

        if (!processor) {
          ctx.status = 500;
          ctx.body = { error: 'Workflow trigger failed' };
          return;
        }

        const { execution, lastSavedJob } = processor;

        if (execution.status === EXECUTION_STATUS.RESOLVED) {
          // Check execution.output (set by Output node) first, then lastSavedJob.result
          const output = execution.output ?? lastSavedJob?.result;
          if (output) {
            // String value → treat as redirect URL directly
            if (typeof output === 'string') {
              ctx.redirect(output);
              return;
            }
            // Object with url → redirect
            if (typeof output === 'object' && output.url) {
              ctx.redirect(output.url);
              return;
            }
            // Object with status → custom response (block / custom page)
            if (typeof output === 'object' && output.status) {
              ctx.status = output.status;
              ctx.body = output.body ?? '';
              return;
            }
          }
          // No special action — passthrough to next middleware
          continue;
        }

        if (execution.status < EXECUTION_STATUS.STARTED) {
          // Workflow rejected / error
          ctx.status = 403;
          ctx.body = { error: 'Access denied by workflow' };
          return;
        }

        // Pending / unknown — should not happen for sync
        ctx.status = 500;
        ctx.body = { error: 'Workflow execution did not complete' };
        return;
      }

      // --- Let the request through ---
      await next();

      // --- Async workflows: fire after response ---
      for (const [wf, context] of asyncWorkflows) {
        self.workflow.trigger(wf, context);
      }
    });
  }

  /**
   * Find all enabled "url" workflows whose pattern matches the given path.
   */
  private getMatchingWorkflows(path: string, method: string): WorkflowModel[] {
    const results: WorkflowModel[] = [];

    for (const wf of this.workflow.enabledCache.values()) {
      if (wf.type !== UrlTrigger.TYPE) {
        continue;
      }

      const { url: pattern, matchMode = 'glob', methods = [] } = wf.config ?? {};

      if (!pattern) {
        continue;
      }

      // Check HTTP method (empty array = match all)
      if (methods.length && !methods.includes(method.toUpperCase())) {
        continue;
      }

      if (matchUrl(pattern, matchMode, path)) {
        results.push(wf);
      }
    }

    return results;
  }

  /**
   * Build the trigger context that workflow nodes can access via variables.
   */
  private buildContext(ctx: Context) {
    const { currentUser, currentRole } = ctx.state ?? {};
    return {
      url: ctx.path,
      query: ctx.query ?? {},
      method: ctx.method,
      user: currentUser ? toJSON(currentUser) : null,
      roleName: currentRole ?? null,
    };
  }

  /**
   * Manual / API execution (for testing workflows).
   */
  async execute(workflow: WorkflowModel, values: any, options: any) {
    return this.workflow.trigger(workflow, values, options);
  }

  validateContext(values: any) {
    if (!values?.url) {
      return { url: 'URL is required' };
    }
    return null;
  }
}
