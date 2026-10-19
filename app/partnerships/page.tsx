import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, GlassWater, Handshake, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Partnerships",
  description: "Meet the community partners supporting Pakistan Padel Community."
};

const partners = [
  {
    name: "Top Juice",
    type: "Refreshments partner",
    description: "A local favourite for fresh juices and refreshing drinks, helping our players and supporters recharge on and off the court.",
    logo: "/images/partners/top-juice.png",
    logoAlt: "Top Juice logo",
    icon: GlassWater,
    logoClassName: "partner-logo--top-juice"
  },
  {
    name: "Rulo Padel",
    type: "Padel equipment partner",
    description: "A dedicated padel equipment shop offering rackets, accessories and court essentials for players who want to enjoy and improve their game.",
    logo: "/images/partners/rulo-padel.png",
    logoAlt: "Rulo Padel logo",
    icon: ShoppingBag,
    logoClassName: "partner-logo--rulo"
  }
];

export default function PartnershipsPage() {
  return (
    <div className="space-y-6">
      <section className="court-panel partner-hero rounded-lg px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase text-limeball"><Handshake className="h-4 w-4" /> PPC partnerships</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Our community partners</h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-300">Meet the local businesses supporting Pakistan Padel Community and helping us build a stronger, more welcoming padel community.</p>
        </div>
      </section>

      <section aria-labelledby="partner-list-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-court">Proudly supported by</p>
            <h2 id="partner-list-title" className="text-xl font-black text-slate-950">PPC partners</h2>
          </div>
          <Link href="/" className="btn-secondary shrink-0"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {partners.map((partner) => {
            const Icon = partner.icon;
            return (
              <article key={partner.name} className="partner-card sport-card overflow-hidden">
                <div className={`partner-logo ${partner.logoClassName}`}>
                  <Image src={partner.logo} alt={partner.logoAlt} width={720} height={420} className="h-full w-full object-contain" priority />
                </div>
                <div className="p-5 sm:p-6">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase text-court"><Icon className="h-4 w-4" /> {partner.type}</p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">{partner.name}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{partner.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
