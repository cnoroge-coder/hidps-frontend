import Image from 'next/image';

const tech = [
  { name: 'Next.js', icon: '/next.svg' },
  { name: 'React', icon: '' },
  { name: 'TypeScript', icon: '' },
  { name: 'Tailwind CSS', icon: '' },
  { name: 'Vercel', icon: '/vercel.svg' },
];

const TechStack = () => {
  return (
    <div className="bg-gray-800 py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center text-white mb-12">Technical Stack</h2>
        <div className="flex justify-center items-center space-x-8">
          {tech.map((t) => (
            <div key={t.name} className="flex flex-col items-center">
              {t.icon ? (
                <Image src={t.icon} alt={t.name} width={64} height={64} className="h-16 w-16 mb-2" />
              ) : (
                <div className="h-16 w-16 mb-2 flex items-center justify-center text-4xl font-bold text-white bg-gray-700 rounded-full">
                  {t.name.substring(0, 2)}
                </div>
              )}
              <p className="text-white font-semibold">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechStack;
