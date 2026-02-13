import Link from 'next/link';

const Hero = () => {
  return (
    <div className="text-center py-20 bg-gray-900 text-white">
      <h1 className="text-5xl font-bold mb-4">
        Host-Based Intrusion Detection and Prevention System (HIDPS)
      </h1>
      <p className="text-xl mb-8">
        An enterprise-grade, open-source HIDPS designed for proactive threat hunting and real-time response.
      </p>
      <div className="space-x-4">
        <Link href="/demo" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded">
          View Demo
        </Link>
        <Link href="/signup" className="bg-transparent hover:bg-gray-800 text-white font-semibold py-3 px-6 border border-white rounded">
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default Hero;
