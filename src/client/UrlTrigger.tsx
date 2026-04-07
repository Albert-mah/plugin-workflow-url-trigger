/**
 * This file is part of the NocoBase (R) project.
 * Copyright (c) 2020-2024 NocoBase Co., Ltd.
 * Authors: NocoBase Team.
 *
 * This project is dual-licensed under AGPL-3.0 and NocoBase Commercial License.
 * For more information, please refer to: https://www.nocobase.com/agreement.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Flex, Input, Popconfirm } from 'antd';
import { CaretRightOutlined, DeleteOutlined } from '@ant-design/icons';
import { ArrayField } from '@formily/core';
import { useForm, useFormEffects } from '@formily/react';
import { onFieldInputValueChange } from '@formily/core';
import { useMemoizedFn } from 'ahooks';
import qs from 'qs';
import { useCompile, RemoteSelect, css, Input as NInput, Fieldset, useAPIClient } from '@nocobase/client';
import {
  Trigger,
  useWorkflowAnyExecuted,
  getCollectionFieldOptions,
  useGetDataSourceCollectionManager,
} from '@nocobase/plugin-workflow/client';
import { NAMESPACE, useLang, lang } from './locale';

function MiddlewareStatusAlert() {
  const api = useAPIClient();
  const [needRestart, setNeedRestart] = useState(false);

  useEffect(() => {
    api.request({ url: 'urlTrigger:status', method: 'get' })
      .then((res) => {
        const registered = res?.data?.data?.middlewareRegistered;
        if (registered === false) {
          setNeedRestart(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!needRestart) return null;

  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginBottom: 16 }}
      message={lang('URL trigger middleware is not active. Please restart the application for URL interception to take effect.')}
    />
  );
}

const HTTP_METHODS = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'PATCH', value: 'PATCH' },
  { label: 'DELETE', value: 'DELETE' },
];

// --- Parsing helpers (from webhook plugin) ---

function getAllPaths(obj, prefix = '', paths: string[] = []) {
  Object.keys(obj).forEach((key) => {
    const currentPath = prefix ? (Array.isArray(obj) ? `${prefix}[${key}]` : `${prefix}.${key}`) : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      paths.push(currentPath);
      getAllPaths(obj[key], currentPath, paths);
    } else {
      paths.push(currentPath);
    }
  });
  return paths;
}

function getQuery(str) {
  if (!str) return '';
  const splitQuery = str.split('?');
  return splitQuery.slice(-1)[0];
}

const ParsingQueryTextarea = ({ value, onChange }) => {
  const form = useForm();
  const run = useMemoizedFn(async () => {
    try {
      const query = getQuery(value);
      const parsed = qs.parse(query);
      const keyPaths = getAllPaths(parsed);
      const queryVar = keyPaths.map((v, i) => ({ key: v, alias: '', _var: `query_$${i}` }));
      const field = form.query('request.query').take() as ArrayField;
      field.onInput(queryVar);
    } catch (e) {
      console.error(e);
    }
  });
  const clearItems = useMemoizedFn(() => {
    const field = form.query('request.query').take() as ArrayField;
    field.onInput([]);
  });

  return (
    <div>
      <Input.TextArea
        onChange={(e) => onChange(e.target.value)}
        value={value}
        placeholder={lang('Paste a sample URL or query string, e.g. ?enc=xxx&type=login')}
        className={css`font-size:80%;font-family:Consolas,Monaco,monospace;margin-bottom:6px;`}
        autoSize={{ minRows: 2 }}
      />
      <Flex gap="small">
        <Button icon={<CaretRightOutlined />} size="small" onClick={run}>{lang('Parse')}</Button>
        <Popconfirm onConfirm={clearItems} title={lang('Clear all items?')}>
          <Button icon={<DeleteOutlined />} size="small">{lang('Clear')}</Button>
        </Popconfirm>
      </Flex>
    </div>
  );
};

const ParsingBodyJson = ({ value, onChange }) => {
  const form = useForm();
  const run = useMemoizedFn(async () => {
    try {
      const keyPaths = getAllPaths(value);
      const bodyVar = keyPaths.map((v, i) => ({ key: v, alias: '', _var: `body_$${i}` }));
      const field = form.query('request.body').take() as ArrayField;
      field.onInput(bodyVar);
    } catch (e) {
      console.error(e);
    }
  });
  const clearItems = useMemoizedFn(() => {
    const field = form.query('request.body').take() as ArrayField;
    field.onInput([]);
  });

  return (
    <div>
      <NInput.JSON
        onChange={onChange}
        value={value}
        placeholder={lang('Paste sample JSON body, e.g. {"userId": 1, "action": "login"}')}
        autoSize={{ minRows: 3 }}
        style={{ marginBottom: 6 }}
      />
      <Flex gap="small">
        <Button icon={<CaretRightOutlined />} size="small" onClick={run}>{lang('Parse')}</Button>
        <Popconfirm onConfirm={clearItems} title={lang('Clear all items?')}>
          <Button icon={<DeleteOutlined />} size="small">{lang('Clear')}</Button>
        </Popconfirm>
      </Flex>
    </div>
  );
};

const AddVar = () => {
  useFormEffects(() => {
    onFieldInputValueChange('request.body', (field) => {
      field.setValue(field.value.map((v, i) => ({ ...v, _var: `body_$${i}` })));
    });
    onFieldInputValueChange('request.query', (field) => {
      field.setValue(field.value.map((v, i) => ({ ...v, _var: `query_$${i}` })));
    });
  });
  return null;
};

// --- Variables ---

function useVariables(config, options) {
  const compile = useCompile();
  const mainCollectionManager = useGetDataSourceCollectionManager();

  const loadChildren = (items) => {
    return (items || []).map((item) => ({
      isLeaf: true,
      label: item.alias || item.key,
      value: item._var || item.key,
      key: item._var || item.key,
    }));
  };

  const result = [];

  result.push({ key: 'url', value: 'url', label: lang('URL path') });
  result.push({ key: 'method', value: 'method', label: lang('HTTP method') });

  if (config.request?.query?.length) {
    result.push({
      isLeaf: false,
      label: lang('Query parameters'),
      value: 'query',
      key: 'query',
      children: loadChildren(config.request.query),
    });
  } else {
    result.push({ key: 'query', value: 'query', label: lang('Query parameters') });
  }

  if (config.request?.body?.length) {
    result.push({
      isLeaf: false,
      label: lang('Request body'),
      value: 'body',
      key: 'body',
      children: loadChildren(config.request.body),
    });
  } else {
    result.push({ key: 'body', value: 'body', label: lang('Request body') });
  }

  result.push(
    { key: 'headers', value: 'headers', label: lang('Request headers') },
    ...getCollectionFieldOptions({
      appends: ['user'],
      ...options,
      fields: [
        {
          collectionName: 'users', name: 'user', type: 'hasOne', target: 'users',
          uiSchema: { title: lang('Current user') },
        },
        { name: 'roleName', uiSchema: { title: lang('Current role') } },
      ],
      compile,
      collectionManager: mainCollectionManager,
    }),
  );

  return result;
}

// --- Trigger class ---

export default class extends Trigger {
  title = `{{t("URL event", { ns: "${NAMESPACE}" })}}`;
  description = `{{t("Triggered when a user accesses a URL matching the configured pattern. In sync mode the workflow can intercept and redirect; in async mode it fires without blocking.", { ns: "${NAMESPACE}" })}}`;

  fieldset = {
    statusAlert: {
      type: 'void',
      'x-component': 'MiddlewareStatusAlert',
    },
    addVarHook: {
      type: 'void',
      'x-component': 'AddVar',
    },
    url: {
      type: 'string',
      required: true,
      title: `{{t("URL pattern", { ns: "${NAMESPACE}" })}}`,
      description: `{{t("Glob examples: /admin/*, /api/users/**. Regex examples: ^/admin/(settings|users)", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Input',
      'x-component-props': { placeholder: '/api/my-endpoint/**' },
      'x-disabled': '{{ useWorkflowAnyExecuted() }}',
    },
    matchMode: {
      type: 'string',
      title: `{{t("Match mode", { ns: "${NAMESPACE}" })}}`,
      'x-decorator': 'FormItem',
      'x-component': 'Radio.Group',
      'x-component-props': { optionType: 'button' },
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
      'x-component-props': { options: HTTP_METHODS },
      default: [],
    },
    request: {
      type: 'object',
      'x-decorator': 'FormItem',
      'x-component': 'Fieldset',
      title: `{{t("Request data parsing", { ns: "${NAMESPACE}" })}}`,
      description: `{{t("Define expected parameters so they appear as selectable variables in downstream nodes.", { ns: "${NAMESPACE}" })}}`,
      properties: {
        tabs: {
          type: 'void',
          'x-component': 'Tabs',
          properties: {
            queryTab: {
              type: 'void',
              title: `{{t("Query parameters", { ns: "${NAMESPACE}" })}}`,
              'x-component': 'Tabs.TabPane',
              properties: {
                queryString: {
                  type: 'string',
                  title: `{{t("Sample input", { ns: "${NAMESPACE}" })}}`,
                  'x-decorator': 'FormItem',
                  'x-decorator-props': { layout: 'vertical' },
                  'x-component': 'ParsingQueryTextarea',
                },
                query: {
                  type: 'array',
                  'x-decorator': 'FormItem',
                  'x-decorator-props': { layout: 'vertical' },
                  'x-component': 'ArrayItems',
                  default: [],
                  items: {
                    type: 'object',
                    'x-component': 'Flex',
                    'x-component-props': { gap: 'small' },
                    properties: {
                      keyDiv: {
                        type: 'void',
                        'x-component': 'div',
                        properties: {
                          key: {
                            type: 'string',
                            required: true,
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': { placeholder: `{{t("Key path", { ns: "${NAMESPACE}" })}}` },
                          },
                        },
                      },
                      aliasDiv: {
                        type: 'void',
                        'x-component': 'div',
                        properties: {
                          alias: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': { placeholder: `{{t("Alias", { ns: "${NAMESPACE}" })}}` },
                          },
                        },
                      },
                      remove: {
                        type: 'void',
                        'x-decorator': 'FormItem',
                        'x-component': 'ArrayItems.Remove',
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: `{{t("Add item", { ns: "${NAMESPACE}" })}}`,
                      'x-component': 'ArrayItems.Addition',
                    },
                  },
                },
              },
            },
            bodyTab: {
              type: 'void',
              title: `{{t("Request body", { ns: "${NAMESPACE}" })}}`,
              'x-component': 'Tabs.TabPane',
              properties: {
                jsonForBody: {
                  type: 'string',
                  title: `{{t("Sample input", { ns: "${NAMESPACE}" })}}`,
                  'x-decorator': 'FormItem',
                  'x-decorator-props': { layout: 'vertical' },
                  'x-component': 'ParsingBodyJson',
                },
                body: {
                  type: 'array',
                  'x-decorator': 'FormItem',
                  'x-decorator-props': { layout: 'vertical' },
                  'x-component': 'ArrayItems',
                  default: [],
                  items: {
                    type: 'object',
                    'x-component': 'Flex',
                    'x-component-props': { gap: 'small' },
                    properties: {
                      keyDiv: {
                        type: 'void',
                        'x-component': 'div',
                        properties: {
                          key: {
                            type: 'string',
                            required: true,
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': { placeholder: `{{t("Key path", { ns: "${NAMESPACE}" })}}` },
                          },
                        },
                      },
                      aliasDiv: {
                        type: 'void',
                        'x-component': 'div',
                        properties: {
                          alias: {
                            type: 'string',
                            'x-decorator': 'FormItem',
                            'x-component': 'Input',
                            'x-component-props': { placeholder: `{{t("Alias", { ns: "${NAMESPACE}" })}}` },
                          },
                        },
                      },
                      remove: {
                        type: 'void',
                        'x-decorator': 'FormItem',
                        'x-component': 'ArrayItems.Remove',
                      },
                    },
                  },
                  properties: {
                    add: {
                      type: 'void',
                      title: `{{t("Add item", { ns: "${NAMESPACE}" })}}`,
                      'x-component': 'ArrayItems.Addition',
                    },
                  },
                },
              },
            },
          },
        },
      },
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

  components = {
    Alert,
    Fieldset,
    Flex,
    AddVar,
    MiddlewareStatusAlert,
    ParsingQueryTextarea,
    ParsingBodyJson,
    Popconfirm,
  };

  scope = {
    useWorkflowAnyExecuted,
  };

  useVariables = useVariables;

  validate(config) {
    return !!config?.url;
  }
}
