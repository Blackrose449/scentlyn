import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import { PageLoading } from "./components/storefront/page-loading";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPendingComponent: PageLoading,
    defaultPendingMs: 100,
    defaultPendingMinMs: 0,
    defaultPreloadStaleTime: 0,
    // Start loading the next page on hover/touch so taps open instantly on slow mobile data.
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient, wrapQueryClient: false });
  return router;
};
