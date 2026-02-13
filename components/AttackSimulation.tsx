const attacks = [
  {
    name: 'SSH Brute Force',
    description: 'Simulated a dictionary attack against the SSH server. Detected and blocked after 5 failed attempts.',
    log: 'ALERT: Multiple failed login attempts from 192.168.10.5. IP blocked.',
  },
  {
    name: 'Rootkit Injection',
    description: 'Attempted to modify core system files. Detected unauthorized file changes via FIM.',
    log: 'FIM ALERT: Unauthorized modification of /bin/bash detected.',
  },
];

const AttackSimulation = () => {
  return (
    <div className="bg-gray-900 text-white py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">Battle Tested</h2>
        <div className="space-y-12">
          {attacks.map((attack) => (
            <div key={attack.name} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden md:flex">
              <div className="p-8 md:w-1/2">
                <h3 className="text-3xl font-bold mb-4">{attack.name}</h3>
                <p className="text-gray-400 mb-6">{attack.description}</p>
              </div>
              <div className="p-8 md:w-1/2 bg-black">
                <h4 className="text-xl font-semibold mb-4 text-gray-400">Detection Log:</h4>
                <pre className="text-green-400 bg-gray-900 p-4 rounded-lg">
                  <code>{attack.log}</code>
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttackSimulation;
