import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Users, 
  Twitter, 
  Send, 
  Github,
  ExternalLink,
  TrendingUp,
  Heart
} from "lucide-react";

const socialLinks = [
  {
    name: "Telegram",
    icon: Send,
    description: "Join our main community",
    members: "12.5K",
    link: "#",
    color: "bg-blue-500"
  },
  {
    name: "Twitter",
    icon: Twitter,
    description: "Follow for updates",
    members: "8.2K",
    link: "#",
    color: "bg-blue-400"
  },
  {
    name: "Discord",
    icon: MessageCircle,
    description: "Chat with holders",
    members: "6.8K",
    link: "#",
    color: "bg-indigo-500"
  },
  {
    name: "GitHub",
    icon: Github,
    description: "View our code",
    members: "234",
    link: "#",
    color: "bg-gray-700"
  }
];

const communityStats = [
  {
    icon: Users,
    label: "Total Holders",
    value: "15,247",
    change: "+12.5%",
    positive: true
  },
  {
    icon: TrendingUp,
    label: "24h Volume",
    value: "$124.8K",
    change: "+67.2%",
    positive: true
  },
  {
    icon: Heart,
    label: "Community Score",
    value: "9.6/10",
    change: "+0.3",
    positive: true
  },
  {
    icon: MessageCircle,
    label: "Active Members",
    value: "2,847",
    change: "+8.1%",
    positive: true
  }
];

export const Community = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-secondary/10 rounded-full blur-3xl"></div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-secondary bg-clip-text text-transparent">
              Join Our Pack
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with fellow degens and stay updated on all things $DOGE
          </p>
        </div>

        {/* Community Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {communityStats.map((stat, index) => (
            <Card key={index} className="gradient-card border-primary/20 p-6 text-center transition-all duration-300 hover:scale-105">
              <div className="gradient-primary p-3 rounded-lg w-fit mx-auto mb-4 glow-primary">
                <stat.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground mb-2">{stat.label}</div>
              <Badge className={`${stat.positive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                {stat.change}
              </Badge>
            </Card>
          ))}
        </div>

        {/* Social Links Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {socialLinks.map((social, index) => (
            <Card key={index} className="gradient-card border-primary/20 p-6 group transition-all duration-300 hover:scale-105 hover:border-primary/40 cursor-pointer">
              <div className="text-center">
                <div className={`${social.color} p-4 rounded-xl w-fit mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <social.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{social.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{social.description}</p>
                <div className="text-primary font-semibold mb-4">{social.members} members</div>
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground">
                  Join Now
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="gradient-card border-primary/20 p-8 text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Join the 
            <span className="gradient-primary bg-clip-text text-transparent"> Pack</span>?
          </h3>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            Don't miss out on the next big memecoin movement. Join thousands of holders and be part of the journey to the moon!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="crypto" size="lg" className="text-lg px-8">
              <Users className="w-5 h-5" />
              Join Telegram
            </Button>
            <Button variant="glow" size="lg" className="text-lg px-8">
              <Twitter className="w-5 h-5" />
              Follow on Twitter
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};