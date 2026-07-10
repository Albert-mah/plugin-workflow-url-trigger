/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import { Plugin } from '@nocobase/server';
import WorkflowPlugin from '@nocobase/plugin-workflow';

import UrlTrigger from './UrlTrigger';
import ResponseInstruction from './ResponseInstruction';

export default class extends Plugin {
  async load() {
    const workflowPlugin = this.app.pm.get(WorkflowPlugin) as WorkflowPlugin;
    const urlTrigger = new UrlTrigger(workflowPlugin);
    workflowPlugin.registerTrigger('url', urlTrigger);
    workflowPlugin.registerInstruction('url-response', ResponseInstruction);

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
        // Returns whether the Koa middleware is registered.
        // If false, the app needs a restart for URL triggers to work.
        status: {
          handler: async (ctx, next) => {
            ctx.body = { middlewareRegistered: urlTrigger.middlewareRegistered };
            return next();
          },
        },
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

    // IMPORTANT: configs MUST be 'public', NOT 'loggedIn'.
    // The client-side route guard calls configs on every page load, including
    // before the user is authenticated. If this returns 401, NocoBase's global
    // axios interceptor treats it as "session expired", calls auth:signOut which
    // blocks the current token via jwt.block(), and clears localStorage.
    // This causes all subsequent requests to fail with BLOCKED_TOKEN.
    // configs only returns URL patterns (no sensitive data), so public is safe.
    this.app.acl.allow('urlTrigger', 'configs', 'public');
    this.app.acl.allow('urlTrigger', 'check', 'loggedIn');
    this.app.acl.allow('urlTrigger', 'status', 'loggedIn');
  }
}
