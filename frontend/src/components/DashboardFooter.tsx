import { APP_NAME } from "@/config/app";
import Link from "next/link";

export const DashboardFooter = () => {
  return (
    <footer className="w-full border-t border-gray-200 py-4 px-4 text-sm text-gray-500">
      <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-2 sm:mb-0">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
        <div className="flex space-x-6">
          <Link
            href="/privacy-policy"
            className="hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="hover:text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <Link
            href="https://github.com/enderNakamoto"
            target="_blank"
            className="hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
};
