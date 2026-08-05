using System;

using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Drawing;

namespace Printer.SDK.API
{
    public class PrinterState
    {
        //Printer Status
        public static readonly uint STS_NORMAL = 0x00;
        public static readonly uint STS_PAPEREMPTY = 1;
        public static readonly uint STS_COVEROPEN = 2;
        public static readonly uint STS_PAPERNEAREND = 4;
        public static readonly uint STS_MSR_READY = 8;
        public static readonly uint STS_SMARTCARD_READY = 16;
        public static readonly uint STS_ERROR = 32;
        public static readonly uint STS_NOT_OPEN = 64;
        public static readonly uint STS_OFFLINE = 128;
        public static readonly uint STS_ONBUSY = 256;

        uint m_status = 0;

        public PrinterState()
        {
            m_status = 0;
        }
        public uint State
        {
            get { return m_status; }
            set { m_status = value; }
        }
        public bool IsNormal
        {
            get { return (STS_NORMAL == m_status); }
        }
        public bool InError
        {
            get
            {
                return (PAPEREMPTY || COVEROPEN || PAPERNEAREND || MSR_READY || SMARTCARD_READY || ERROR || NOT_OPEN || OFFLINE);
            }
        }
        public bool PAPEREMPTY
        {
            get { return ((STS_PAPEREMPTY & m_status) > 0); }
        }
        public bool COVEROPEN
        {
            get { return ((STS_COVEROPEN & m_status) > 0); }
        }
        public bool PAPERNEAREND
        {
            get { return ((STS_PAPERNEAREND & m_status) > 0); }
        }
        public bool MSR_READY
        {
            get { return ((STS_MSR_READY & m_status) > 0); }
        }
        public bool SMARTCARD_READY
        {
            get { return ((STS_SMARTCARD_READY & m_status) > 0); }
        }
        public bool ERROR
        {
            get { return ((STS_ERROR & m_status) > 0); }
        }
        public bool NOT_OPEN
        {
            get { return ((STS_NOT_OPEN & m_status) > 0); }
        }
        public bool OFFLINE
        {
            get { return ((STS_OFFLINE & m_status) > 0); }
        }
        public bool ONBUSY
        {
            get { return ((STS_ONBUSY & m_status) > 0); }
        }

    }

    public class DllAPI
    {
      
        public const string DLLDIR = "ESC_SDK.dll";
        //public const CharSet charSet = CharSet.Unicode;
        public const CharSet charSet = CharSet.Ansi;

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int FormatError(int error_no, int langid, byte[] buf, int pos, int bufSize);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrinterCreator(ref IntPtr printer, string model);

        [DllImport(DLLDIR)]
        public static extern int PrinterDestroy(IntPtr printer);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PortOpen(IntPtr printer, string portSetting);

        [DllImport(DLLDIR)]
        public static extern int PortClose(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int PrinterInitialize(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int FeedLine(IntPtr printer, int nFeed);

        [DllImport(DLLDIR)]
        public static extern int SetAlign(IntPtr printer, int align);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintText(IntPtr printer, byte[] text, int alignment, int attribute, int textSize);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintText(IntPtr printer, string text, int alignment, int attribute, int textSize);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintBarCode(IntPtr printer, int bcType, string bcData, int width, int height, int alignment, int hriPosition);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintSymbol(IntPtr printer, int type, string bcData, int errLevel, int width, int height, int alignment);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int DefineDownloadedImage(IntPtr printer, string imagePath, byte kc1, byte kc2);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintDownloadedImage(IntPtr printer, byte kc1, byte kc2);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int DefineBufferedImage(IntPtr printer, string imagePath);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintBufferedImage(IntPtr printer);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int DefineNVImage(IntPtr printer, string imagePath, byte kc1, byte kc2);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintNVImage(IntPtr printer, byte kc1, byte kc2);
        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int PrintImage(IntPtr printer, string filePath, int scaleMode);

        [DllImport(DLLDIR)]
        public static extern int CutPaper(IntPtr printer, int cutMode, int distance);

        [DllImport(DLLDIR)]
        public static extern int OpenCashDrawer(IntPtr printer, int pinMode, int onTime, int offTime);

        [DllImport(DLLDIR)]
        public static extern int SelectStandardMode(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int SetTextLineSpace(IntPtr printer, int lineSpace);
        
        [DllImport(DLLDIR)]
        public static extern int SetTextFont(IntPtr printer, int font);

        [DllImport(DLLDIR)]
        public static extern int SetAbsolutePrintPosition(IntPtr printer, int position);

        [DllImport(DLLDIR)]
        public static extern int SelectPageMode(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int SetPrintAreaInPageMode(IntPtr printer, int horizontal
        , int vertical, int width, int height);

        [DllImport(DLLDIR)]
        public static extern int CancelPrintDataInPageMode(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int SelectPrintDirectionInPageMode(IntPtr printer, int direction);

        [DllImport(DLLDIR)]
        public static extern int SetAbsoluteVerticalPrintPositionInPageMode(IntPtr printer, int position);

        [DllImport(DLLDIR)]
        public static extern int PrintAndReturnStandardMode(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int PrintDataInPageMode(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int GetPrinterState(IntPtr printer, ref uint printerState);

        [DllImport(DLLDIR)]
        public static extern int DirectIO(IntPtr printer, byte[] writeData, int writenum, byte[] readData, int readNum, ref int readedNum);
        
        [DllImport(DLLDIR)]
        public static extern int WriteData(IntPtr printer, string writeData, int writeNum);

        [DllImport(DLLDIR)]
        public static extern int GetFirmwareVersion(IntPtr printer, int[] version, int versionLen);

        [DllImport(DLLDIR)]
        public static extern int GetPrinterSN(IntPtr printer, byte[] readSN, ref int snLenth);

        [DllImport(DLLDIR)]
        public static extern int PositionNextLabel(IntPtr printer);

        [DllImport(DLLDIR)]
        public static extern int SetCodePage(IntPtr printer, int codePage, int Type);

        [DllImport(DLLDIR, CharSet = charSet)]
        public static extern int SetLog(int enable, string path);

        [DllImport(DLLDIR)]
        public static extern int DrawLine(IntPtr printer, int xStart, int yStart, int xEnd, int yEnd, int lineWidth);

        [DllImport(DLLDIR)]
        public static extern int DrawRectangle(IntPtr printer, int xStart, int yStart, int xArea, int yArea, int lineWidth);

        [DllImport(DLLDIR)]
        public static extern int GetPaperFeedLinesNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetHeadEnergizingStrokesNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int ClearPrinterMileage(IntPtr printer,int clearType);

        [DllImport(DLLDIR)]
        public static extern int GetAutocutterOperationsNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetPrinterOperationPeriod(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetOverTemperatureErrorReportNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetPrinterPointsNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetCutterErrorNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetPowerOnOpenCoverNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetHalfCutNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int GetTotalCutNumber(IntPtr printer, ref int readedNum);

        [DllImport(DLLDIR)]
        public static extern int ClearPrinterMileage2(IntPtr printer);

        public string FormatError(int error_no)
        {
            int langid = 0;

            byte[] temp = new byte[512];

            FormatError(error_no, langid, temp, 0, 512);

            return System.Text.Encoding.Default.GetString(temp,0,512);
        }
    }
}
