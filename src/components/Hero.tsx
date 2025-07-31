import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp } from "lucide-react";
import heroImage from "@/assets/crypto-dog-hero.jpg";

export const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20"></div>
      <div className="absolute top-20 left-20 w-32 h-32 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-secondary/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/20">
                <Zap className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Now Live on DEX</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                <span className="gradient-primary bg-clip-text text-transparent animate-gradient">
                  $DOGE
                </span>
                <br />
                <span className="text-foreground">
                  To The Moon! 🚀
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-lg">
                The ultimate memecoin for true crypto degens. Built by the community, for the community.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="crypto" size="lg" className="text-lg px-8 py-6">
                Buy $DOGE Now
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <Button variant="neon" size="lg" className="text-lg px-8 py-6">
                <TrendingUp className="w-5 h-5" />
                View Chart
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">$2.5M</div>
                <div className="text-sm text-muted-foreground">Market Cap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-secondary">15.2K</div>
                <div className="text-sm text-muted-foreground">Holders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-accent">+2,847%</div>
                <div className="text-sm text-muted-foreground">24h Gain</div>
              </div>
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="relative">
            <div className="relative mx-auto max-w-lg">
              <div className="absolute inset-0 gradient-primary rounded-3xl blur-2xl opacity-20 animate-pulse-glow"></div>
              <img 
                src={heroImage} 
                alt="Crypto Dog Memecoin"
                className="relative rounded-3xl shadow-2xl w-full animate-float"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};