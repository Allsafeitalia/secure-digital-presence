import { motion } from 'framer-motion';

const lightColors = [
  'hsl(0, 80%, 50%)',    // Red
  'hsl(120, 70%, 40%)',  // Green
  'hsl(45, 100%, 50%)',  // Gold
  'hsl(200, 90%, 50%)',  // Blue
  'hsl(300, 70%, 50%)',  // Purple
];

export const ChristmasLights = () => {
  const lights = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: lightColors[i % lightColors.length],
    delay: i * 0.15,
  }));

  return (
    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pointer-events-none overflow-hidden">
      {/* Wire */}
      <div className="absolute bottom-3 left-0 right-0 h-[2px] bg-muted-foreground/30" 
           style={{ 
             background: 'repeating-linear-gradient(90deg, hsl(var(--muted-foreground) / 0.4) 0px, hsl(var(--muted-foreground) / 0.4) 20px, transparent 20px, transparent 22px)' 
           }} 
      />
      
      {lights.map((light) => (
        <motion.div
          key={light.id}
          className="relative flex flex-col items-center"
          style={{ zIndex: 10 }}
        >
          {/* Bulb holder */}
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-t-sm" />
          
          {/* Light bulb */}
          <motion.div
            className="w-3 h-4 rounded-full"
            style={{
              background: light.color,
              boxShadow: `0 0 8px ${light.color}, 0 0 16px ${light.color}`,
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 1.2,
              delay: light.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      ))}
    </div>
  );
};
