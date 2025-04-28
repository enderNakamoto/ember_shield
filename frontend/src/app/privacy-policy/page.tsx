import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { APP_NAME } from "@/config/app";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4 py-16 flex-1">
        <h1 className="text-3xl font-bold mb-8 mt-12">Privacy Policy</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              At {APP_NAME}, we respect your privacy and are committed to
              protecting your personal data. This privacy policy explains how we
              collect, use, and safeguard your information when you use our
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>
                Personal identification information (Name, email address, wallet
                address)
              </li>
              <li>Transaction data</li>
              <li>Usage data and platform interactions</li>
              <li>Device and connection information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. How We Use Your Information
            </h2>
            <p>We use your data to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide and maintain our services</li>
              <li>Process transactions</li>
              <li>Improve and personalize user experience</li>
              <li>Communicate with you about service updates</li>
              <li>Ensure platform security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access,
              alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Third-Party Services
            </h2>
            <p>
              Our service may contain links to third-party websites or services.
              We are not responsible for the privacy practices or content of
              these third-party sites.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>
              Depending on your location, you may have certain rights regarding
              your personal data, including:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Access to your personal data</li>
              <li>Rectification of inaccurate data</li>
              <li>Erasure of your data</li>
              <li>Restriction of processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Changes to This Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at: https://github.com/enderNakamoto
            </p>
          </section>

          <div className="text-sm text-gray-500 mt-8">
            Last updated: March 1, 2025
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
