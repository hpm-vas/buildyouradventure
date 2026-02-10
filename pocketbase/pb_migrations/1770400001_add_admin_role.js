/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // No-op: admin role removed, only gamemaster is used
  // This migration previously added 'admin' role but is now obsolete
}, (app) => {
  // No-op revert
});
