/* ============================================================
 * env.js — 环境配置（部署时按环境替换本文件即可，其余代码不动）
 *  - dev：  纯前端 Demo，数据来自 js/data.js，接口调用为空转
 *  - prod： 由 CI/CD 或部署脚本写入生产 API 地址与环境名
 * ============================================================ */

window.QUQI_ENV = {
  /** dev | staging | production */
  ENV: "dev",
  /** 后端 API 根地址（NestJS，见 server/，统一前缀 /api/v1） */
  API_BASE: "http://localhost:3000/api/v1",
  /** 是否使用 js/data.js 的本地演示数据（生产置 false，走 API） */
  USE_MOCK: true,
};
