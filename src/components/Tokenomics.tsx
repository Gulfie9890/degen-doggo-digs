import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Users, Lock, Coins, Zap } from "lucide-react";

const tokenomicsData = [
  { name: "Community", value: 40, color: "hsl(25, 95%, 58%)" },
  { name: "Liquidity Pool", value: 30, color: "hsl(280, 100%, 70%)" },
  { name: "Marketing", value: 15, color: "hsl(195, 100%, 50%)" },
  { name: "Development", value: 10, color: "hsl(45, 100%, 60%)" },
  { name: "Team (Locked)", value: 5, color: "hsl(0, 84%, 60%)" },
];

const features = [
  {
    icon: Users,
    title: "Community Driven",
    description: "40% of tokens go directly to the community",
    stat: "40%"
  },
  {
    icon: Lock,
    title: "Liquidity Locked",
    description: "LP tokens locked for 2 years minimum",
    stat: "2 Years"
  },
  {
    icon: Coins,
    title: "Total Supply",
    description: "Fixed supply, no minting allowed",
    stat: "1B Tokens"
  },
  {
    icon: Zap,
    title: "Zero Tax",
    description: "No buy/sell taxes, pure memecoin",
    stat: "0% Tax"
  }
];

export const Tokenomics = () => {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="gradient-secondary bg-clip-text text-transparent">
              Tokenomics
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Designed for maximum community ownership and long-term sustainability
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Pie Chart */}
          <Card className="gradient-card border-primary/20 p-8">
            <h3 className="text-2xl font-bold text-center mb-8">Token Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tokenomicsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {tokenomicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(240, 8%, 12%)',
                      border: '1px solid hsl(240, 5%, 20%)',
                      borderRadius: '8px',
                      color: 'hsl(45, 100%, 90%)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {tokenomicsData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Features Grid */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <Card key={index} className="gradient-card border-primary/20 p-6 transition-all duration-300 hover:scale-105 hover:border-primary/40">
                <div className="flex items-start gap-4">
                  <div className="gradient-primary p-3 rounded-lg glow-primary">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold">{feature.title}</h4>
                      <span className="text-lg font-bold text-primary">{feature.stat}</span>
                    </div>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Contract Address */}
        <Card className="gradient-card border-primary/20 p-6 text-center">
          <h3 className="text-xl font-bold mb-4">Contract Address</h3>
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm break-all">
            0x1234567890123456789012345678901234567890
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Always verify the contract address before trading
          </p>
        </Card>
      </div>
    </section>
  );
};