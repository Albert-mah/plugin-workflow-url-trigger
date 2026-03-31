import { Trigger, useWorkflowAnyExecuted } from '@nocobase/plugin-workflow/client';
import { NAMESPACE } from '../locale';

const HTTP_METHODS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

export default class extends Trigger {
  title = `{{t("URL event", { ns: "${NAMESPACE}" })}}`;
  description = `{{t("Triggered when a user accesses a URL matching the configured pattern. In sync mode the workflow can intercept and redirect; in async mode it fires without blocking.", { ns: "${NAMESPACE}" })}}`;

  fieldset = {
    url: {
      type: 'string',
      required: true,
      title: `{{t("URL pattern", { ns: "${NAMESPACE}" })}}`,
      description: `{{t("Glob examples: /admin/*, /api/users/**. Regex examples: ^/admin/(settings|users)", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': {
        placeholder: '/admin/**',
      },
      'x-disabled': '{{ useWorkflowAnyExecuted() }}',
    },
    matchMode: {
      type: 'string',
      title: `{{t("Match mode", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Radio.Group',
      'x-component-props': {
        optionType: 'button',
      },
      enum: [
        { label: 'Glob', value: 'glob' },
        { label: 'Regex', value: 'regex' },
      ],
      default: 'glob',
    },
    methods: {
      type: 'array',
      title: `{{t("HTTP methods", { ns: "${NAMESPACE}" })}}`,
      description: `{{t("Leave empty to match all methods", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Checkbox.Group',
      'x-component-props': {
        options: HTTP_METHODS,
      },
      default: [],
    },
  };

  triggerFieldset = {
    url: {
      type: 'string',
      title: `{{t("URL", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      required: true,
    },
  };

  components = {};

  scope = {
    useWorkflowAnyExecuted,
  };

  useVariables(config, options) {
    return [
      {
        key: 'url',
        value: 'url',
        label: `{{t("URL path", { ns: "${NAMESPACE}" })}}`,
      },
      {
        key: 'query',
        value: 'query',
        label: `{{t("Query parameters", { ns: "${NAMESPACE}" })}}`,
        children: [],
      },
      {
        key: 'method',
        value: 'method',
        label: `{{t("HTTP method", { ns: "${NAMESPACE}" })}}`,
      },
      {
        key: 'user',
        value: 'user',
        label: `{{t("Current user", { ns: "${NAMESPACE}" })}}`,
        children: [],
      },
      {
        key: 'roleName',
        value: 'roleName',
        label: `{{t("Current role", { ns: "${NAMESPACE}" })}}`,
      },
    ];
  }

  validate(config) {
    return !!config?.url;
  }
}
