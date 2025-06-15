import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Clock, Coins, Sparkles, Star, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

// Enhanced Card Animation Component
const AnimatedCard: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ 
  children, 
  className = "", 
  delay = 0 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{ 
      scale: 1.05,
      y: -8,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    whileTap={{ scale: 0.98 }}
    className="group cursor-pointer"
  >
    <Card className={`
      relative overflow-hidden
      bg-gradient-to-br from-purple-50/80 to-pink-50/80 
      dark:from-purple-900/40 dark:to-pink-900/20 
      border border-purple-200/60 dark:border-purple-700/40
      backdrop-blur-sm shadow-lg
      hover:shadow-2xl hover:shadow-purple-500/25
      hover:border-purple-400/80 dark:hover:border-purple-500/60
      transform transition-all duration-300 ease-out
      hover:bg-gradient-to-br hover:from-purple-100/90 hover:to-pink-100/90
      dark:hover:from-purple-800/60 dark:hover:to-pink-800/40
      ${className}
    `}>
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/5 to-pink-400/0 
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      <div className="relative z-10">
        {children}
      </div>
    </Card>
  </motion.div>
);

// Enhanced Feature Card Component
const FeatureCard: React.FC<{ feature: any; index: number }> = ({ feature, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.6 }}
    whileHover={{ 
      scale: 1.08,
      y: -12,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    className="group cursor-pointer"
  >
    <Card className="p-6 h-full
                   bg-gradient-to-br from-purple-50/90 to-pink-50/90 
                   dark:from-purple-900/50 dark:to-pink-900/30 
                   border border-purple-200/60 dark:border-purple-700/40
                   hover:shadow-2xl hover:shadow-purple-500/30
                   hover:border-purple-400/80 dark:hover:border-purple-500/60
                   transform transition-all duration-300 ease-out
                   hover:bg-gradient-to-br hover:from-purple-100/95 hover:to-pink-100/95
                   dark:hover:from-purple-800/70 dark:hover:to-pink-800/50
                   relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity duration-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      </div>
      
      <div className="relative z-10">
        <motion.div 
          className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 
                     dark:from-purple-800/80 dark:to-pink-800/80 
                     flex items-center justify-center mb-4
                     group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
          whileHover={{ rotate: 360, scale: 1.2 }}
          transition={{ duration: 0.6 }}
        >
          {feature.icon}
        </motion.div>
        <h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-100 
                       group-hover:text-purple-800 dark:group-hover:text-purple-50 transition-colors">
          {feature.title}
        </h3>
        <p className="text-purple-700 dark:text-purple-300 text-sm leading-relaxed
                      group-hover:text-purple-800 dark:group-hover:text-purple-200 transition-colors">
          {feature.description}
        </p>
      </div>
    </Card>
  </motion.div>
);

const Home: React.FC = () => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  // Enhanced stats data
  const stats = [
    { label: "💰 Total Value Locked", value: "$24.5M", color: "from-purple-500 to-pink-500" },
    { label: "📊 Total Borrowed", value: "$12.8M", color: "from-blue-500 to-purple-500" },
    { label: "👥 Active Users", value: "1,250+", color: "from-pink-500 to-purple-500" }
  ];

  // Enhanced features data
  const features = [
    {
      icon: <Coins className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: '💎 Deposit Collateral',
      description: 'Supply premium assets to the protocol and use them as collateral to unlock borrowing power.'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-pink-600 dark:text-pink-400" />,
      title: '📈 Earn Interest',
      description: 'Generate passive income on your supplied assets with competitive rates based on real market dynamics.'
    },
    {
      icon: <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />,
      title: '🛡️ Monitor Health',
      description: 'Stay protected with our advanced health monitoring system that prevents liquidation risks.'
    },
    {
      icon: <Clock className="h-8 w-8 text-pink-600 dark:text-pink-400" />,
      title: '⚡ Instant Transactions',
      description: 'Experience lightning-fast repayments and withdrawals with our optimized smart contracts.'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-16 pb-32 overflow-hidden">
        {/* Enhanced background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 
                        dark:from-purple-900/50 dark:via-pink-900/30 dark:to-blue-900/50 -z-10"></div>
        
        {/* Enhanced Polkadot pattern decoration */}
        <div className="absolute inset-0 opacity-20">
          <motion.div 
            className="absolute h-32 w-32 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 top-1/4 left-1/4 blur-xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>
          <motion.div 
            className="absolute h-40 w-40 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 bottom-1/4 right-1/4 blur-xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>
          <motion.div 
            className="absolute h-24 w-24 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 top-1/2 right-1/3 blur-xl"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          ></motion.div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div
              variants={itemVariants}
              className="flex justify-center mb-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="text-6xl"
              >
                ✨
              </motion.div>
            </motion.div>

            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6 
                         bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600"
              variants={itemVariants}
            >
              🚀 Decentralized Lending on Polkadot
            </motion.h1>
            
            <motion.p 
              className="text-lg sm:text-xl text-purple-700 dark:text-purple-300 mb-10 max-w-2xl mx-auto leading-relaxed"
              variants={itemVariants}
            >
              💎 Deposit collateral, borrow assets, and earn interest in a secure, 
              non-custodial protocol powered by cutting-edge PolkaVM technology.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row justify-center items-center gap-4"
              variants={itemVariants}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link 
                  to="/dashboard" 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 
                           hover:from-purple-600 hover:to-pink-600 
                           text-white font-bold rounded-xl px-8 py-4 
                           flex items-center justify-center space-x-2 
                           shadow-lg shadow-purple-500/30 
                           hover:shadow-xl hover:shadow-purple-500/40
                           transition-all duration-300 transform
                           border border-purple-400/20 min-h-[56px] w-full sm:w-auto"
                >
                  <Sparkles size={20} className="animate-pulse" />
                  <span>🚀 Launch App</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <a 
                  href="#learn-more" 
                  className="bg-white/80 dark:bg-purple-900/50 
                           hover:bg-white dark:hover:bg-purple-800/70 
                           text-purple-800 dark:text-purple-200 
                           font-bold rounded-xl px-8 py-4 
                           flex items-center justify-center
                           border border-purple-200 dark:border-purple-700
                           hover:border-purple-300 dark:hover:border-purple-600
                           transition-all duration-300 backdrop-blur-sm
                           shadow-lg hover:shadow-xl min-h-[56px] w-full sm:w-auto"
                >
                  📚 Learn More
                </a>
              </motion.div>
            </motion.div>
            
            {/* Enhanced Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ 
                    scale: 1.08,
                    y: -8,
                    transition: { duration: 0.3 }
                  }}
                  className="group cursor-pointer"
                >
                  <AnimatedCard delay={index * 0.1}>
                    <div className="p-6 text-center">
                      <p className="text-purple-600 dark:text-purple-400 text-sm font-medium mb-2">
                        {stat.label}
                      </p>
                      <motion.p 
                        className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent
                                   group-hover:scale-110 transition-transform duration-300`}
                        whileHover={{ scale: 1.1 }}
                      >
                        {stat.value}
                      </motion.p>
                    </div>
                  </AnimatedCard>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="learn-more" className="py-20 bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 
                                          dark:from-neutral-900 dark:via-purple-900/20 dark:to-pink-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4 
                           bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              ✨ How PolkaLend Works
            </h2>
            <p className="text-purple-700 dark:text-purple-300 max-w-2xl mx-auto leading-relaxed">
              🎯 Our protocol enables users to lend and borrow digital assets through 
              a secure and efficient decentralized platform with cutting-edge features.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>
      
      {/* Enhanced Supported Assets Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50/50 to-pink-50/50 
                          dark:from-purple-900/30 dark:to-pink-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4
                           bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              🌟 Supported Assets
            </h2>
            <p className="text-purple-700 dark:text-purple-300 max-w-2xl mx-auto">
              💫 PolkaLend supports a premium variety of assets from the thriving Polkadot ecosystem.
            </p>
          </motion.div>
          
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            {[
              { name: 'Polkadot', icon: '/assets/dot.svg', gradient: 'from-pink-400 to-purple-500' },
              { name: 'Kusama', icon: '/assets/ksm.svg', gradient: 'from-purple-400 to-blue-500' },
              { name: 'Astar', icon: '/assets/astr.svg', gradient: 'from-blue-400 to-purple-500' },
              { name: 'Moonbeam', icon: '/assets/glmr.svg', gradient: 'from-purple-400 to-pink-500' },
              { name: 'USDT', icon: '/assets/usdt.svg', gradient: 'from-green-400 to-blue-500' },
              { name: 'USDC', icon: '/assets/usdc.svg', gradient: 'from-blue-400 to-purple-500' },
            ].map((asset, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center group cursor-pointer"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                whileHover={{ 
                  scale: 1.15, 
                  y: -8,
                  transition: { duration: 0.3 }
                }}
                viewport={{ once: true }}
              >
                <motion.div 
                  className={`p-4 rounded-2xl bg-gradient-to-br ${asset.gradient} shadow-lg 
                             group-hover:shadow-xl group-hover:shadow-purple-500/30 
                             transition-all duration-300`}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <img src={asset.icon} alt={asset.name} className="h-8 w-8 sm:h-12 sm:w-12" />
                </motion.div>
                <span className="mt-3 text-sm font-semibold text-purple-700 dark:text-purple-300 
                               group-hover:text-purple-800 dark:group-hover:text-purple-200 
                               transition-colors">
                  {asset.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-white/10 -top-48 -right-48"
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute w-72 h-72 rounded-full bg-white/5 -bottom-36 -left-36"
            animate={{ 
              rotate: -360,
              scale: [1.1, 1, 1.1]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="flex justify-center mb-6"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Star className="text-6xl text-yellow-300" fill="currentColor" />
            </motion.div>

            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6 text-white">
              🎉 Ready to Start Your DeFi Journey?
            </h2>
            <p className="text-purple-100 max-w-2xl mx-auto mb-10 text-lg leading-relaxed">
              🚀 Join the future of decentralized finance on Polkadot with PolkaLend. 
              Connect your wallet and start earning premium returns today!
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                to="/dashboard" 
                className="inline-flex items-center space-x-3 
                         bg-white hover:bg-purple-50 
                         text-purple-600 font-bold rounded-xl px-8 py-4 
                         shadow-xl hover:shadow-2xl 
                         transition-all duration-300 transform
                         border-2 border-white/20 hover:border-white/40"
              >
                <Zap className="animate-pulse" size={20} />
                <span>🚀 Launch App Now</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;