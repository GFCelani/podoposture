import { Approach } from "@/components/approach";
import { ClinicalResponsibility } from "@/components/clinical-responsibility";
import { Hero } from "@/components/hero";
import { ServicesGrid } from "@/components/services-grid";
import { SiteHeader } from "@/components/site-header";
import { TreatmentCards } from "@/components/treatment-cards";
import { UnderstandFirst } from "@/components/understand-first";
import { Welcome } from "@/components/welcome";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Welcome />
        <ClinicalResponsibility />
        <UnderstandFirst />
        <Approach />
        <TreatmentCards />
        <ServicesGrid />
      </main>
    </>
  );
}
