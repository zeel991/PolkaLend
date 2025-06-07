import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Clock, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

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

  return (
    <div className="flex flex-col min-h-screen ">
      {/* Hero Section */}
      <section className="relative pt-16 pb-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-neutral-900 dark:to-neutral-800 -z-10"></div>
        
        {/* Polkadot pattern decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute h-32 w-32 rounded-full bg-primary-300 top-1/4 left-1/4 blur-xl"></div>
          <div className="absolute h-40 w-40 rounded-full bg-secondary-300 bottom-1/4 right-1/4 blur-xl"></div>
          <div className="absolute h-24 w-24 rounded-full bg-accent-300 top-1/2 right-1/3 blur-xl"></div>
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500"
              variants={itemVariants}
            >
              Decentralized Lending on Polkadot
            </motion.h1>
            
            <motion.p 
              className="text-lg sm:text-xl text-neutral-700 dark:text-neutral-300 mb-10 max-w-2xl mx-auto"
              variants={itemVariants}
            >
              Deposit collateral, borrow assets, and earn interest in a secure, 
              non-custodial protocol powered by PolkaVM.
            </motion.p>
            
            <motion.div 
  className="flex flex-col sm:flex-row justify-center gap-4"
  variants={itemVariants}
  style={{ pointerEvents: 'auto', zIndex: 10 }} 
  onClick={() => console.log('Motion div clicked')} 
>
  <Link 
    to="/dashboard" 
    className="bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg px-6 py-3 flex items-center justify-center space-x-2 shadow-lg shadow-primary-500/20 transition-all duration-200"
    onClick={(e) => {
      console.log('Link clicked');
      e.stopPropagation();
    }}
    style={{ pointerEvents: 'auto', zIndex: 11 }} 
  >
    <span>Launch App</span>
    <ArrowRight size={18} />
  </Link>
              
              <a 
                href="#learn-more" 
                className="bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium rounded-lg px-6 py-3 border border-neutral-200 dark:border-neutral-700 transition-all duration-200"
              >
                Learn More
              </a>
            </motion.div>
            
            {/* Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-white"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <motion.div 
                className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg"
                variants={itemVariants}
              >
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Total Value Locked</p>
                <p className="text-2xl font-semibold mt-1">$24.5M</p>
              </motion.div>
              
              <motion.div 
                className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg"
                variants={itemVariants}
              >
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Total Borrowed</p>
                <p className="text-2xl font-semibold mt-1">$12.8M</p>
              </motion.div>
              
              <motion.div 
                className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-lg"
                variants={itemVariants}
              >
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Active Users</p>
                <p className="text-2xl font-semibold mt-1">1,250+</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="learn-more" className="py-20 bg-white dark:bg-neutral-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">How PolkaLend Works</h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Our protocol enables users to lend and borrow digital assets through 
              a secure and efficient decentralized platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Coins className="h-8 w-8 text-primary-500" />,
                title: 'Deposit Collateral',
                description: 'Supply assets to the protocol and use them as collateral to borrow other assets.'
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-secondary-500" />,
                title: 'Earn Interest',
                description: 'Earn interest on your supplied assets based on market demand and supply.'
              },
              {
                icon: <Shield className="h-8 w-8 text-accent-500" />,
                title: 'Monitor Health Ratio',
                description: 'Keep track of your position\'s health ratio to avoid liquidation.'
              },
              {
                icon: <Clock className="h-8 w-8 text-success-500" />,
                title: 'Repay & Withdraw',
                description: 'Repay your borrowed assets at any time and withdraw your collateral.'
              }
            ].map((feature, index) => (
              <Card 
                key={index} 
                className="p-6"
                hoverEffect
              >
                <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Supported Assets Section */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Supported Assets</h2>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              PolkaLend supports a variety of assets from the Polkadot ecosystem.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 max-w-4xl mx-auto">
            {[
              { name: 'Polkadot', icon: '/assets/dot.svg' },
              { name: 'Kusama', icon: '/assets/ksm.svg' },
              { name: 'Astar', icon: '/assets/astr.svg' },
              { name: 'Moonbeam', icon: '/assets/glmr.svg' },
              { name: 'USDT', icon: '/assets/usdt.svg' },
              { name: 'USDC', icon: '/assets/usdc.svg' },
            ].map((asset, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                <img src={asset.icon} alt={asset.name} className="h-12 w-12 sm:h-16 sm:w-16" />
                <span className="mt-2 text-sm font-medium text-neutral-600 dark:text-neutral-400">{asset.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20 bg-primary-500">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-6 text-white">Ready to Start?</h2>
          <p className="text-primary-100 max-w-2xl mx-auto mb-10">
            Join the future of decentralized finance on Polkadot with PolkaLend. 
            Connect your wallet and start earning today.
          </p>
          
          <Link 
            to="/dashboard" 
            className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-100 text-primary-500 font-medium rounded-lg px-6 py-3 shadow-lg transition-all duration-200"
          >
            <span>Launch App</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;