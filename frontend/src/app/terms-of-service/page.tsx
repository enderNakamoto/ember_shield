import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { ASSET_SYMBOL } from "@/contract/asset";
import { APP_NAME } from "@/config/app";

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="container max-w-4xl mx-auto px-4 py-16 flex-1">
        <h1 className="text-3xl font-bold mb-8 mt-12">Terms of Service</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using {APP_NAME}, you agree to be bound by these
              Terms of Service. If you do not agree to all the terms and
              conditions, you may not access or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Service Description
            </h2>
            <p>
              {APP_NAME} provides a crypto hedging platform powered by{" "}
              {ASSET_SYMBOL}. Our services enable users to protect their digital
              assets against market volatility through various hedging
              strategies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p>
              To access certain features of our platform, you may need to create
              an account. You are responsible for maintaining the
              confidentiality of your account credentials and for all activities
              that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. User Obligations</h2>
            <p>When using our services, you agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Comply with all applicable laws and regulations</li>
              <li>Not engage in any fraudulent or illegal activities</li>
              <li>Not interfere with the proper operation of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Risk Disclosure</h2>
            <p>
              Cryptocurrency trading and hedging involve significant risk. The
              value of digital assets can fluctuate dramatically, and past
              performance is not indicative of future results. You should
              carefully consider your investment objectives, level of
              experience, and risk appetite before using our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Intellectual Property
            </h2>
            <p>
              All content, features, and functionality of the {APP_NAME}
              platform, including but not limited to text, graphics, logos, and
              software, are owned by {APP_NAME} and are protected by
              intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, {APP_NAME} and its
              affiliates shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of
              profits, data, or use, arising out of or in connection with these
              Terms or your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              8. Modifications to the Service
            </h2>
            <p>
              We reserve the right to modify or discontinue, temporarily or
              permanently, the service (or any part thereof) with or without
              notice. We shall not be liable to you or any third party for any
              modification, suspension, or discontinuance of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the jurisdiction in which {APP_NAME} is registered,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
              https://github.com/enderNakamoto
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

export default TermsOfService;
