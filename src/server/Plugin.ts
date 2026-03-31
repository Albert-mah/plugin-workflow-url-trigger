import { Plugin } from '@nocobase/server';
import WorkflowPlugin from '@nocobase/plugin-workflow';

import UrlTrigger from './UrlTrigger';

export default class extends Plugin {
  async load() {
    const workflowPlugin = this.app.pm.get(WorkflowPlugin) as WorkflowPlugin;
    const urlTrigger = new UrlTrigger(workflowPlugin);
    workflowPlugin.registerTrigger('url', urlTrigger);

    this.app.resourceManager.define({
      name: 'urlTrigger',
      actions: {
        // Returns all enabled URL trigger patterns for client-side pre-matching.
        // The client caches these and only calls `check` when a pattern matches.
        configs: {
          handler: async (ctx, next) => {
            ctx.body = urlTrigger.getConfigs();
            return next();
          },
        },
        // Executes matching sync workflows for a given path and returns the result.
        check: {
          handler: async (ctx, next) => {
            const { path } = ctx.action.params?.values ?? {};
            if (!path || typeof path !== 'string') {
              ctx.body = { action: 'passthrough' };
              return next();
            }
            const result = await urlTrigger.evaluateUrl(path, 'GET', ctx);
            ctx.body = result;
            return next();
          },
        },
      },
    });

    this.app.acl.allow('urlTrigger', 'configs', 'loggedIn');
    this.app.acl.allow('urlTrigger', 'check', 'loggedIn');
  }
}
