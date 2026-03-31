import { Plugin } from '@nocobase/server';
import WorkflowPlugin from '@nocobase/plugin-workflow';

import UrlTrigger from './UrlTrigger';

export default class extends Plugin {
  async load() {
    const workflowPlugin = this.app.pm.get(WorkflowPlugin) as WorkflowPlugin;
    workflowPlugin.registerTrigger('url', new UrlTrigger(workflowPlugin));
  }
}
