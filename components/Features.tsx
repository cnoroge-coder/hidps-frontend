const features = [
  {
    name: 'Log Decoders',
    description: 'Custom regex logic to parse auth.log and syslog.',
  },
  {
    name: 'FIM (File Integrity)',
    description: 'Hash-based comparison to detect unauthorized modifications.',
  },
  {
    name: 'Notification Engine',
    description: 'Integrated SMTP and Africa’s Talking SDK for instant alerts.',
  },
  {
    name: 'Encrypted Tunnel',
    description: 'Secure UDP transport layer to prevent packet sniffing.',
  },
];

const Features = () => {
  return (
    <div className="bg-gray-800 py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-white mb-12">Core Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div key={feature.name} className="bg-gray-900 p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold text-white mb-4">{feature.name}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
