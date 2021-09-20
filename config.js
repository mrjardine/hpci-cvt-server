module.exports = {
  apiPathPrefix: process.env.API_PATH_PREFIX,
  devDbFile: process.env.DB_FILE_DEV,
  devDbPath: process.env.DB_PATH_DEV,
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  maxTokensToStore: process.env.MAX_TOKENS_TO_STORE_IN_NOTIFICATIONS_TO,
  maxViewableLatestNotifications: process.env.MAX_VIEWABLE_LATEST_NOTIFICATIONS,
  maxWindowInDaysLatestNotifications:
    process.env.MAX_WINDOW_IN_DAYS_LATEST_NOTIFICATIONS
};
