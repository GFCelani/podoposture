import { Approach } from "@/components/approach";
import { ClinicalResponsibility } from "@/components/clinical-responsibility";
import { Contact } from "@/components/contact";
import { FloatingWhatsApp } from "@/components/floating-whatsapp";
import { Gallery } from "@/components/gallery";
import { Hero } from "@/components/hero";
import { Journal } from "@/components/journal";
import { SeamRuler } from "@/components/layers";
import { MetodoRegulador } from "@/components/metodo-regulador";
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
      <main id="conteudo">
        <Hero />
        <SeamRuler />
        <Welcome />
        <ClinicalResponsibility />
        <UnderstandFirst />
        <SeamRuler />
        <Approach />
        <MetodoRegulador />
        <TreatmentCards />
        <ServicesGrid />
        <Contact />
        <Journal />
        <Gallery />
        <SeamRuler />
        <SocialBand n="12" />
      </main>
      <SiteFooter />
      <FloatingWhatsApp />
    </>
  );
}
