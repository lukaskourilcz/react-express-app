/**
 * Config for the WidgetKit extension target, consumed by @bacons/apple-targets
 * during `expo prebuild`. The App Group here MUST match app.json's
 * ios.entitlements and the native bridge module.
 *
 * @type {import('@bacons/apple-targets').Config}
 */
module.exports = {
  type: 'widget',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.yourcompany.devquiz'],
  },
};
