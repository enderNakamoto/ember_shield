import { APP_NAME } from "@/config/app";
import { ASSET_SYMBOL } from "@/contract/asset";
import {
  LucideGithub,
  LucideTwitter,
  LucideLinkedin,
  LucideYoutube,
} from "lucide-react";
import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-[#1A1F2C] text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-primary">{APP_NAME}</h3>
            <p className="text-gray-400">
              Next-generation crypto hedging platform powered by {ASSET_SYMBOL}
            </p>
            <div className="flex space-x-4">
              <Link href="https://x.com/">
                <LucideTwitter className="w-5 h-5 text-gray-400 hover:text-primary cursor-pointer transition-colors" />
              </Link>
              <Link href="https://www.linkedin.com/">
                <LucideLinkedin className="w-5 h-5 text-gray-400 hover:text-primary cursor-pointer transition-colors" />
              </Link>
              <Link href="https://github.com/">
                <LucideGithub className="w-5 h-5 text-gray-400 hover:text-primary cursor-pointer transition-colors" />
              </Link>
              <Link href="https://www.youtube.com/">
                <LucideYoutube className="w-5 h-5 text-gray-400 hover:text-primary cursor-pointer transition-colors" />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-primary cursor-pointer transition-colors">
                Features
              </li>
              <li className="hover:text-primary cursor-pointer transition-colors">
                Pricing
              </li>
              <li className="hover:text-primary cursor-pointer transition-colors">
                Use Cases
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li className="hover:text-primary cursor-pointer transition-colors">
                Documentation
              </li>
              <li className="hover:text-primary cursor-pointer transition-colors">
                API Reference
              </li>
              <li className="hover:text-primary cursor-pointer transition-colors">
                Blog
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <Link href="https://github.com/enderNakamoto" target="_blank">
                About
              </Link>
              <li className="hover:text-primary cursor-pointer transition-colors">
                <Link href="/hiring">Careers</Link>
              </li>
              <li className="hover:text-primary cursor-pointer transition-colors">
                <Link href="https://github.com/enderNakamoto" target="_blank">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0 text-sm text-gray-400">
              <Link
                href="/privacy-policy"
                className="hover:text-primary cursor-pointer transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="hover:text-primary cursor-pointer transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="https://github.com/enderNakamoto"
                target="_blank"
                className="hover:text-primary cursor-pointer transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
