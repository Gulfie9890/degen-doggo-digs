import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Twitter, 
  Send, 
  MessageCircle, 
  Github, 
  ExternalLink,
  AlertTriangle,
  Shield
} from "lucide-react";

const socialLinks = [
  { name: "Twitter", icon: Twitter, link: "#" },
  { name: "Telegram", icon: Send, link: "#" },
  { name: "Discord", icon: MessageCircle, link: "#" },
  { name: "GitHub", icon: Github, link: "#" }
];

const quickLinks = [
  { name: "Whitepaper", link: "#" },
  { name: "Audit Report", link: "#" },
  { name: "CoinGecko", link: "#" },
  { name: "CoinMarketCap", link: "#" },
  { name: "DEX Tools", link: "#" },
  { name: "Uniswap", link: "#" }
];

export const Footer = () => {
  return (
    <footer className="py-16 relative overflow-hidden border-t border-primary/20">
      <div className="container mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <h3 className="text-3xl font-bold mb-4">
              <span className="gradient-primary bg-clip-text text-transparent">$DOGE</span>
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              The ultimate memecoin for crypto degens. Join our pack and ride the wave to the moon! 
              Built by the community, for the community.
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="icon" 
                  className="hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                >
                  <social.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.link} 
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 flex items-center gap-2 group"
                  >
                    {link.name}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contract Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contract Info</h4>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Contract Address:</p>
                <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs break-all border border-primary/20">
                  0x1234...7890
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Audited & Verified</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="mb-8 bg-primary/20" />

        {/* Disclaimer */}
        <Card className="bg-card/50 border-orange-500/30 p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-orange-400 mb-2">Important Disclaimer</h5>
              <p className="text-sm text-muted-foreground">
                $DOGE is a memecoin created for entertainment purposes. Cryptocurrency investments carry high risk. 
                Only invest what you can afford to lose. Always do your own research (DYOR) before making any investment decisions. 
                This is not financial advice.
              </p>
            </div>
          </div>
        </Card>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© 2024 $DOGE Memecoin. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Risk Disclosure</a>
          </div>
        </div>
      </div>
    </footer>
  );
};