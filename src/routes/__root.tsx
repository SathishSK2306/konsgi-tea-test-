import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import {
  clearStoreSession,
  getStoreSession,
  setStoreSession as saveStoreSession,
  type StoreSession,
} from "@/lib/store-session";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MobileBottomNav } from "@/components/MobileBottomNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl text-gradient-gold">404</h1>
        <h2 className="mt-4 text-xl">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kongsi — Premium Wholesale Coffee Supplies" },
      { name: "description", content: "Wholesale tea, coffee, packaging, food and dessert supplies for cafes and bubble tea bars across India." },
      { property: "og:title", content: "Kongsi — Premium Wholesale Coffee Supplies" },
      { property: "og:description", content: "Wholesale tea, coffee, packaging, food and dessert supplies for cafes and bubble tea bars across India." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Kongsi — Premium Wholesale Coffee Supplies" },
      { name: "twitter:description", content: "Wholesale tea, coffee, packaging, food and dessert supplies for cafes and bubble tea bars across India." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18d16fbd-3bda-4faa-a649-b553b8b1cdd6/id-preview-32b87fe5--ce1743b5-37dc-4a29-8b45-795afff330c4.lovable.app-1778825636383.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/18d16fbd-3bda-4faa-a649-b553b8b1cdd6/id-preview-32b87fe5--ce1743b5-37dc-4a29-8b45-795afff330c4.lovable.app-1778825636383.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <AppShell />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = path.startsWith("/admin");
  const isAuthPage = path.startsWith("/auth");

  if (isAdmin || isAuthPage) {
    return (
      <>
        <Outlet />
        <Toaster richColors position="top-right" />
      </>
    );
  }

  return <AuthedShell />;
}

function AuthedShell() {
  const [storeSession, setStoreSession] = useState<StoreSession | null>(() => getStoreSession());
  const [checkingStore, setCheckingStore] = useState(true);
  const [checkedSessionKey, setCheckedSessionKey] = useState<string | null>(null);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const currentSessionKey = `${path}:${storeSession?.id ?? "none"}`;

  useEffect(() => {
    const session = getStoreSession();
    const nextSessionKey = `${path}:${session?.id ?? "none"}`;
    setStoreSession(session);
    setCheckedSessionKey(null);

    if (!session) {
      setCheckingStore(false);
      router.navigate({ to: "/auth", search: { redirect: path }, replace: true });
      return;
    }

    setCheckingStore(true);
    supabase
      .rpc("get_store_session", { p_store_uuid: session.id })
      .then(({ data }) => {
        const store = data?.[0] ?? null;
        if (!store) {
          clearStoreSession();
          setStoreSession(null);
          router.navigate({ to: "/auth", search: { redirect: path }, replace: true });
          return;
        }

        saveStoreSession(store);
        setStoreSession(store);
        setCheckedSessionKey(nextSessionKey);
      })
      .finally(() => setCheckingStore(false));
  }, [path, router]);

  if (checkingStore || !storeSession || checkedSessionKey !== currentSessionKey) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-28 md:pb-12 min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <Toaster richColors position="top-right" />
    </>
  );
}
