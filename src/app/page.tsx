import { Approach } from "@/components/approach";
import { ClinicalResponsibility } from "@/components/clinical-responsibility";
import { Contact } from "@/components/contact";
import { Gallery } from "@/components/gallery";
import { Hero } from "@/components/hero";
import { Journal } from "@/components/journal";
import { ServicesGrid } from "@/components/services-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SocialBand } from "@/components/social-band";
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
        <Contact />
        <Journal />
        <Gallery />
        <SocialBand />
      </main>
      <SiteFooter />
    </>
  );
}
