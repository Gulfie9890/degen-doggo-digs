import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock, Rocket } from "lucide-react";

const roadmapPhases = [
  {
    phase: "Phase 1",
    title: "Launch & Foundation",
    status: "completed",
    items: [
      "Token Creation & Audit",
      "Website Launch",
      "Community Building",
      "Initial DEX Listing",
      "1K Holders Milestone"
    ]
  },
  {
    phase: "Phase 2", 
    title: "Community Growth",
    status: "current",
    items: [
      "Social Media Campaigns",
      "Influencer Partnerships",
      "Community Contests",
      "10K Holders Milestone",
      "CoinGecko Listing"
    ]
  },
  {
    phase: "Phase 3",
    title: "Major Exchanges",
    status: "upcoming",
    items: [
      "CEX Listings",
      "CoinMarketCap Listing",
      "Major Partnerships",
      "50K Holders Milestone",
      "NFT Collection Drop"
    ]
  },
  {
    phase: "Phase 4",
    title: "Ecosystem Expansion",
    status: "future",
    items: [
      "DeFi Integrations",
      "Staking Platform",
      "Mobile App",
      "100K Holders Milestone",
      "🚀 TO THE MOON! 🚀"
    ]
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-6 h-6 text-green-400" />;
    case "current":
      return <Clock className="w-6 h-6 text-primary" />;
    case "upcoming":
      return <Circle className="w-6 h-6 text-secondary" />;
    case "future":
      return <Rocket className="w-6 h-6 text-accent" />;
    default:
      return <Circle className="w-6 h-6 text-muted-foreground" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
    case "current":
      return <Badge className="bg-primary/20 text-primary border-primary/30">In Progress</Badge>;
    case "upcoming":
      return <Badge className="bg-secondary/20 text-secondary border-secondary/30">Upcoming</Badge>;
    case "future":
      return <Badge className="bg-accent/20 text-accent border-accent/30">Future</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export const Roadmap = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-primary bg-clip-text text-transparent">
              Roadmap
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Our journey to becoming the ultimate memecoin
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-green-400 via-primary via-secondary to-accent opacity-30 hidden lg:block"></div>

          <div className="space-y-12">
            {roadmapPhases.map((phase, index) => (
              <div key={index} className={`flex items-center gap-8 ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                {/* Timeline Dot */}
                <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2 z-10">
                  <div className="gradient-primary p-2 rounded-full glow-primary">
                    {getStatusIcon(phase.status)}
                  </div>
                </div>

                {/* Content Card */}
                <Card className={`flex-1 gradient-card border-primary/20 p-6 transition-all duration-300 hover:scale-105 hover:border-primary/40 ${index % 2 === 0 ? 'lg:mr-8' : 'lg:ml-8'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="lg:hidden">
                          {getStatusIcon(phase.status)}
                        </div>
                        <h3 className="text-xl font-bold">{phase.phase}</h3>
                        {getStatusBadge(phase.status)}
                      </div>
                      <h4 className="text-2xl font-bold text-primary mb-4">{phase.title}</h4>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {phase.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          phase.status === 'completed' ? 'bg-green-400' :
                          phase.status === 'current' ? 'bg-primary' :
                          phase.status === 'upcoming' ? 'bg-secondary' :
                          'bg-accent'
                        }`}></div>
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Spacer for timeline alignment */}
                <div className="flex-1 hidden lg:block"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};