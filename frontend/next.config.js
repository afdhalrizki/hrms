const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

const nextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost', '127.0.0.1:3001', 'localhost:3001'],
};

module.exports = withNextIntl(nextConfig);
