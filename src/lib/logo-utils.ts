import logoRoseFR from '../../public/logoxHQX/HQX-rose-FR.svg';
import logoPinkUK from '../../public/logoxHQX/HQX-pink-UK.svg';
import logoBlancFR from '../../public/logoxHQX/HQX-blanc-FR.svg';
import logoWhiteUK from '../../public/logoxHQX/HQX-white-UK.svg';

export const getLogoPath = (locale: string, variant: 'rose' | 'blanc' | 'pink' | 'white' = 'rose') => {
  const isUK = locale === 'en';
  
  switch (variant) {
    case 'blanc':
    case 'white':
      return isUK ? logoWhiteUK : logoBlancFR;
    case 'pink':
    case 'rose':
    default:
      return isUK ? logoPinkUK : logoRoseFR;
  }
};