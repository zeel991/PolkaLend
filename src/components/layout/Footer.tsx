import React from 'react';
import { Github, Twitter, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2">
              <img src="/polkadot-logo.svg" alt="PolkaLend" className="h-8 w-8" />
              <span className="font-heading text-xl font-semibold text-primary-500">PolkaLend</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              A decentralized lending protocol built on Polkadot.
            </p>
            <div className="flex mt-4 space-x-4">
              <a href="https://github.com" className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" target="_blank" rel="noopener noreferrer">
                <Github size={20} />
              </a>
              <a href="https://twitter.com" className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300" target="_blank" rel="noopener noreferrer">
                <Twitter size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm uppercase text-neutral-700 dark:text-neutral-300 mb-4">Protocol</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Governance
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm uppercase text-neutral-700 dark:text-neutral-300 mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Risk Framework
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Bug Bounty
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-sm uppercase text-neutral-700 dark:text-neutral-300 mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center">
                  Discord
                  <ExternalLink size={12} className="ml-1" />
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center">
                  Telegram
                  <ExternalLink size={12} className="ml-1" />
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center">
                  Forum
                  <ExternalLink size={12} className="ml-1" />
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 flex items-center">
                  Blog
                  <ExternalLink size={12} className="ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 text-sm text-center text-neutral-500 dark:text-neutral-400">
          <p>© {new Date().getFullYear()} PolkaLend Protocol. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;