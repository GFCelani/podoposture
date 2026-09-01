import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";
import { Welcome } from "@/components/welcome";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Welcome />
      </main>
    </>
  );
}
