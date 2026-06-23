import { Joyride, Step, STATUS } from 'react-joyride';

interface TourGuideProps {
  steps: Step[];
  run: boolean;
  onFinish: () => void;
}

export default function TourGuide({ steps, run, onFinish }: TourGuideProps) {
  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  const joyrideProps: any = {
    steps,
    run,
    continuous: true,
    scrollToFirstStep: true,
    showSkipButton: true,
    callback: handleJoyrideCallback,
    styles: {
      options: {
        arrowColor: '#0F172A', // slate-900 (matches dark mode theme nicely)
        backgroundColor: '#0F172A', // slate-900
        overlayColor: 'rgba(15, 23, 42, 0.5)',
        primaryColor: '#0EA5E9', // brand color (sky-500)
        textColor: '#F8FAFC', // slate-50
        zIndex: 1000,
      },
      buttonClose: {
        display: 'none',
      },
      buttonSkip: {
        color: '#94A3B8', // slate-400
        fontSize: '14px',
      },
      buttonBack: {
        color: '#E2E8F0', // slate-200
        marginRight: '8px',
      },
      tooltip: {
        borderRadius: '16px',
        padding: '24px',
        fontFamily: 'inherit',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #1E293B', // slate-800
      },
      tooltipContainer: {
        textAlign: 'left',
      },
      tooltipTitle: {
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '8px',
        color: '#FFFFFF',
      },
      tooltipContent: {
        fontSize: '14px',
        color: '#CBD5E1', // slate-300
        lineHeight: 1.5,
      },
      buttonNext: {
        borderRadius: '8px',
        padding: '8px 16px',
        fontWeight: 600,
      },
    },
    locale: {
      last: "Selesai",
      skip: "Lewati Tour",
      next: "Selanjutnya",
      back: "Kembali"
    }
  };

  return (
    <Joyride {...joyrideProps} />
  );
}
