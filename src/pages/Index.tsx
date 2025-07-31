import { Hero } from "@/components/Hero";
import { Tokenomics } from "@/components/Tokenomics";
import { Roadmap } from "@/components/Roadmap";
import { Community } from "@/components/Community";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Tokenomics />
      <Roadmap />
      <Community />
      <Footer />
    </div>
  );
};

export default Index;
