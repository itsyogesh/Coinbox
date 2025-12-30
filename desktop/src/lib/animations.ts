import { type Transition, type Variants } from "framer-motion";

/**
 * Transition presets for consistent animations
 */
export const transitions = {
  fast: {
    duration: 0.15,
    ease: [0.22, 1, 0.36, 1],
  } as Transition,

  normal: {
    duration: 0.3,
    ease: [0.22, 1, 0.36, 1],
  } as Transition,

  slow: {
    duration: 0.5,
    ease: [0.22, 1, 0.36, 1],
  } as Transition,

  spring: {
    type: "spring",
    stiffness: 400,
    damping: 24,
  } as Transition,

  bouncy: {
    type: "spring",
    stiffness: 260,
    damping: 20,
  } as Transition,

  gentle: {
    type: "spring",
    stiffness: 120,
    damping: 14,
  } as Transition,
};

/**
 * Page transition variants
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
};

/**
 * Fade variants
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/**
 * Scale variants for modals/cards
 */
export const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
  },
};

/**
 * Slide variants
 */
export const slideVariants = {
  fromLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  } as Variants,

  fromRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  } as Variants,

  fromTop: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  } as Variants,

  fromBottom: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  } as Variants,
};

/**
 * Stagger container for list animations
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

/**
 * Stagger item for list animations
 */
export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.spring,
  },
};

/**
 * Card hover animation props
 */
export const cardHover = {
  whileHover: {
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    transition: transitions.fast,
  },
  whileTap: {
    scale: 0.98,
  },
};

/**
 * Button press animation props
 */
export const buttonPress = {
  whileTap: {
    scale: 0.97,
  },
  transition: transitions.fast,
};

/**
 * Page transition motion props
 * Use with motion.div: <motion.div {...pageTransition}>
 */
export const pageTransition = {
  initial: "initial",
  animate: "animate",
  exit: "exit",
  variants: pageVariants,
};
