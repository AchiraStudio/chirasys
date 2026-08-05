using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.IO.Ports;

using Printer.SDK.API;
using System.Text.RegularExpressions;


namespace PrtWinDemo
{
    public partial class PrtWinDemoForm : Form
    {
        //Support Page Mode Models
        public List<string> PageModePrinterList = new List<string> { "TP806", "TP805", "TP801" };

        private IntPtr printer;

        bool isPageModePrinter;
        string imagePath;
        int Index;
        

        public PrtWinDemoForm()
        {
            InitializeComponent();
            setButtonEnable(false);

            this.cmbPortType.SelectedIndex = 1;
            this.cmbModel.Text = PageModePrinterList[1];
            this.cmbModel.Focus();
            this.txtPortSetting.Text = "USB";
            this.cmbImage.SelectedIndex = 0;
        }
        private void setButtonEnable(bool isEnable)
        {
            btnConnect.Enabled = !isEnable;
            btnStop.Enabled = isEnable;
            this.grbBtn.Enabled = isEnable;
            
        }
        private void btnClose_Click(object sender, EventArgs e)
        {
            this.Close();
        }

        private void btnConnect_Click(object sender, EventArgs e)
        {
            string modelsetting = this.cmbModel.Text;
            string portsetting = this.txtPortSetting.Text;

            DllAPI.SetLog(1, "D:\\esc_log.txt");
            if (IntPtr.Zero == printer)
            {
                if (Constants.E_SUCCESS != DllAPI.PrinterCreator(ref printer, modelsetting))
                {
                    MessageBox.Show("Creator Model Failed!");
                    return;
                }
            }

            if (Constants.E_SUCCESS == DllAPI.PortOpen(printer, portsetting))
            {
                //设置字符集
                DllAPI.SetCodePage(printer, Constants.CHARACTERSET_DEFAULT, 0);

                this.tboxInfo.Text = "Connect Succeed";
                setButtonEnable(true);
                //判断是否支持页模式
                isPageModePrinter = PageModePrinterList.Contains(modelsetting);
                if (!isPageModePrinter)
                {
                    this.btnPrintLabel.Enabled = false;
                }
            }
            else
                MessageBox.Show("Port Failed!");
        }
        private void btnStop_Click(object sender, EventArgs e)
        {
            this.tboxInfo.Text = "Close Port";
            DllAPI.PortClose(printer);
            setButtonEnable(false);
            DllAPI.SetLog(0, "");
        }

        private void btnPrintLabel_Click(object sender, EventArgs e) 
        {
            double hMotion = 0.125, vMotion = 0.0625;    // distance per dot
            int pageWidth =72, pageHeight = 200;        // mm
            int width_dots = (int)(pageWidth / hMotion);
            int height_dots = (int)(pageHeight / vMotion);
  
            if (CheckPrinterState())
            {
                DllAPI.PrinterInitialize(printer);
                DllAPI.SelectPageMode(printer);

                DllAPI.SetPrintAreaInPageMode(printer, 0, 0, width_dots, height_dots);

                DllAPI.SelectPrintDirectionInPageMode(printer, Constants.PRINT_DIRECTION_LEFT_TO_RIGHT);

                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 8);

                ////print EAN128
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 96);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_CODE128, "{A1101123456789", 1, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 300);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_EAN13, "2501138000002", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                ////print QRCode
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 300);
                DllAPI.PrintBarCode(printer, Constants.SYMBOL_QRCODE1, "QRCODE 1 123456", 5, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_NONE);

                ////print QRCode
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 520);
                DllAPI.PrintBarCode(printer, Constants.SYMBOL_QRCODE2, "QRCODE 2 654321", 5, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_NONE);

                ////print PDF417  
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 950);
                DllAPI.PrintSymbol(printer, Constants.SYMBOL_STANDARD_PDF417, "China 0123456 ABC +_*&", Constants.PDF417_ERROR_CORRECTION_LEVEL_0, 3, 2, Constants.ALIGNMENT_LEFT);
                //////UPCA
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 1150);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_UPC_A, "023150456784", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);
                //////UPCE
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 1350);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_UPC_E, "01220000899", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                //////print EAN8
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 1550);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_EAN8, "1542656", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                //////print CODE39
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 1850);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_CODE39, "*10401YY00002009*", 2, 100, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                //////print  ITF
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 2050);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_ITF, "11231111032125", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                //////print  CODABAR
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 2250);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_CODABAR, "A40156A", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                //////print  CODE93
                DllAPI.SetAbsolutePrintPosition(printer, 20);
                DllAPI.SetAbsoluteVerticalPrintPositionInPageMode(printer, 2450);
                DllAPI.PrintBarCode(printer, Constants.BARCODE_CODE93, "CODE930093", 2, 60, Constants.ALIGNMENT_LEFT, Constants.BARCODE_HRI_BELOW);

                DllAPI.PrintAndReturnStandardMode(printer);
                //SDK.PositionNextLabel(); 

            }
        }

        private void btnDirectIO_Click(object sender, EventArgs e)
        {
            byte[] writedata = new byte[] { 0x1D, 0x72, 0x01 };
            int readnum = 0;
            byte[] readdata = new byte[1];
            DllAPI.DirectIO(printer, writedata, writedata.Length, readdata, readdata.Length, ref readnum);
            if (readnum > 0)
            {
                tboxInfo.Text = "";
                for (int i = 0; i < readnum; i++)
                {
                    tboxInfo.Text += Convert.ToString(readdata[i], 16) + " ";
                }
            }
        }

        private void btnState_Click(object sender, EventArgs e)
        {
            uint printer_state = 0;
            DllAPI.GetPrinterState(printer, ref printer_state);
            if (Constants.STS_NORMAL == printer_state)
            {
                MessageBox.Show("Printer state normal.");
            }
            else
            {
                CheckPrinterState();
            }
        }

        private void btnPrintReceipt_Click(object sender, EventArgs e)
        {
            if (CheckPrinterState())
            {

                DllAPI.PrinterInitialize(printer);

                DllAPI.PrintText(printer, "Receipt:270500027                Cashier:01012\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "----------------------------------------------\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "  Commodity Code         Price        Quantity\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_FONT_EMPHASIZED | Constants.TEXT_FONT_UNDERLINE_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "01.9940228004700          3.98           1.181\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "   banana                       subtotal:4.70 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "02.996100800220           6.00           0.376\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "   noodle                       subtotal:2.20 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "03.6921644701204          3.50           1    \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "   fruit juice                  subtotal:3.50 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "04.9940316000602          5.16           0.116\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "   flour                        subtotal:0.60 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "----------------------------------------------\n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "Total:                  RMB             11.00 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "Payment:                RMB            101.00 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "Change:                 RMB             90.00 \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "Sold Quantity:                           4    \n", Constants.ALIGNMENT_LEFT, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "  13th,Sep,2014   16:50:19\n", Constants.ALIGNMENT_CENTER, Constants.TEXT_NORMAL_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "Thank you for patronizing\n", Constants.ALIGNMENT_CENTER, Constants.TEXT_FONT_UNDERLINE_MODE, Constants.TEXT_SIZE_0WIDTH | Constants.TEXT_SIZE_0HEIGHT);
                DllAPI.PrintText(printer, "PRT-Mart\n", Constants.ALIGNMENT_CENTER, Constants.TEXT_FONT_REVERSE, Constants.TEXT_SIZE_1WIDTH | Constants.TEXT_SIZE_0HEIGHT);                
                DllAPI.CutPaper(printer, Constants.FULL_CUT, 120);


            }
        }

        private bool CheckPrinterState()
        {
            uint s = 0;
            int result = Constants.E_SUCCESS;

            PrinterState printerState = new PrinterState();

            result = DllAPI.GetPrinterState(printer, ref s);
            if (Constants.E_SUCCESS == result)
            {
                printerState.State = s;
            }
            else
            {
                printerState.State |= PrinterState.STS_ERROR;
            }


            if (printerState.PAPEREMPTY == true)
            {
                MessageBox.Show("Printer paper not present,please insert the printing paper.");
                return false;
            }
            if (printerState.COVEROPEN == true)
            {
                MessageBox.Show("Printer paper cover open,please check paper cover.");
                return false;
            }
            if (printerState.PAPERNEAREND == true)
            {
                tboxInfo.Text = "Printer paper near end,please insert the printing paper.";
            }
            if (printerState.MSR_READY == true)
            {
                //to do
            }
            if (printerState.SMARTCARD_READY == true)
            {
                //to do
            }
            if (printerState.ERROR == true)
            {
                MessageBox.Show("Printer state error.");
                return false;
            }
            if (printerState.NOT_OPEN == true)
            {
                MessageBox.Show("Printer not open.");
                return false;
            }
            if (printerState.OFFLINE == true)
            {
                MessageBox.Show("Printer offline,please check printer state.");
                return false;
            }
            if (printerState.ONBUSY == true)
            {
                MessageBox.Show("Printer busy.");
                return false;
            }

            return true;
        }

        private void cmbPortType_SelectedIndexChanged(object sender, EventArgs e)
        {
            string porttype = this.cmbPortType.Text.ToUpper();
            if ("COM" == porttype)
                this.txtPortSetting.Text = "COM3,BAUDRATE_115200";
            else if ("NET" == porttype)
                this.txtPortSetting.Text = "Net,192.168.1.37";
            else if ("USB" == porttype)
            {
                this.txtPortSetting.Text = "USB";
            }
            else if ("LPT" == porttype)
                this.txtPortSetting.Text = "LPT1";
            else
            {
                this.txtPortSetting.Text = "Invalid";
            }
        }

        private void btnVersion_Click(object sender, EventArgs e)
        {
            int[] Version = new int[3];

            if (Constants.E_SUCCESS == DllAPI.GetFirmwareVersion(printer, Version, Version.Length))
                MessageBox.Show("Printer FirmwareVersion:"
                    + Version[0].ToString() +"."
                    + Version[1].ToString() + "."
                    + Version[2].ToString()
                    );
        }

        private void btnDownLoadImage_Click(object sender, EventArgs e)
        {
            if (CheckPrinterState())
            {
                int result=0;
                OpenFileDialog dlg = new OpenFileDialog();
                dlg.Filter = "Image files|*.bmp;*.gif;*.jpg;*.png;";
                string imgMethod = this.cmbImage.Text;

                if (dlg.ShowDialog() == DialogResult.OK)
                {
                    string fname = dlg.FileName;
                    if ("RasterImage" == imgMethod)
                    {
                        imagePath = fname;
                    }
                    else if ("BufferedImage" == imgMethod)
                    {
                        result = DllAPI.DefineBufferedImage(printer, fname);
                    }
                    else if ("NVImage" == imgMethod)
                    {
                        result = DllAPI.DefineNVImage(printer, fname, (byte)'1', (byte)'1');
                    }
                    else if ("DownloadImage" == imgMethod)
                    {
                        result = DllAPI.DefineDownloadedImage(printer, fname, (byte)'1', (byte)'0');
                    }

                    Index = this.cmbImage.SelectedIndex;
                    if (Constants.E_SUCCESS == result)
                    {
                        MessageBox.Show("DownLoad Succeed.");
                        btnPrint.Enabled = true;
                    }
                    else
                    {
                        MessageBox.Show("DownLoad Failed." + result.ToString());
                        btnPrint.Enabled = false;
                    }
                }
            }
        }

        private void btnPrint_Click(object sender, EventArgs e)
        {
            switch (Index)
            {
                case 0: DllAPI.PrintImage(printer, imagePath, 0);
                        btnPrint.Enabled = false;
                        break;
                case 1: DllAPI.PrintBufferedImage(printer);
                        btnPrint.Enabled = false;
                        break;
                case 2: DllAPI.PrintNVImage(printer, (byte)'1', (byte)'1'); break;
                default:
                    break;
            }
        }

        private void btnPrint_Line_Rectangle_Click(object sender, EventArgs e)
        {
            double hMotion = 0.125, vMotion = 0.0625;    // distance per dot
            int pageWidth = 72, pageHeight = 100;        // mm
            int width_dots = (int)(pageWidth / hMotion);
            int height_dots = (int)(pageHeight / vMotion);

            if (CheckPrinterState())
            {
                DllAPI.PrinterInitialize(printer);
                DllAPI.SelectPageMode(printer);
                DllAPI.SetPrintAreaInPageMode(printer, 0, 0, width_dots, height_dots);
                DllAPI.DrawLine(printer, 10, 10, 200, 10, 50);
                DllAPI.DrawRectangle(printer, 10, 100, 200, 200, 10);
                DllAPI.PrintAndReturnStandardMode(printer);
            }
        }

        private void txtPortSetting_TextChanged(object sender, EventArgs e)
        {

        }

        private void textWrite_TextChanged(object sender, EventArgs e)
        {

        }

        private void textRead_TextChanged(object sender, EventArgs e)
        {

        }

        private void btnRead_Click(object sender, EventArgs e)
        {
            int Result = -1;
            int nGetLenth = 0;
            String strWriteText = "";
            String strstrReadTextAddSpace = "";
            byte[] ReadBytes = new byte[1024];
            strWriteText = this.textWrite.Text;//获取内容
            //strWriteText.Replace(" ", null);//清除字符串所有空格
            strWriteText = strWriteText.Replace(" ", "");
            if ((strWriteText.Length % 2) != 0)
                strWriteText += " ";
            byte[] WriteBytes = new byte[strWriteText.Length/2];
            for (int i = 0; i < WriteBytes.Length; i++)
                WriteBytes[i] = Convert.ToByte(strWriteText.Substring(i * 2, 2), 16);

            Result = DllAPI.DirectIO(printer, WriteBytes, WriteBytes.Length, ReadBytes, ReadBytes.Length, ref nGetLenth);
            if (Constants.E_SUCCESS ==  Result || Constants.E_IO_READ_TIMEOUT ==  Result)
            {
                string strRead = BitConverter.ToString(ReadBytes, 0, nGetLenth).Replace("-", string.Empty);//16转string
                for(int i=0;i<strRead.Length;i++)
                {
                    if(i%2 == 0)
                    {
                        strstrReadTextAddSpace += strRead.Substring(i, 2) + " ";
                    }
                }
                this.textRead.Text = strstrReadTextAddSpace;
                string revDatalenth = "接受字节：" + Convert.ToString(nGetLenth);
                MessageBox.Show(revDatalenth);
            }
            else 
            {
                MessageBox.Show("Write Failed!");
                return;
            }
        }

        private void get_Number_Click(object sender, EventArgs e)
        {
            int readNum = -1;
            int result = 1;
            StringBuilder strEndInfomation = new StringBuilder("");
            result = DllAPI.GetPaperFeedLinesNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Paper Feed Lines Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Paper Feed Lines Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetHeadEnergizingStrokesNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Head Energizing Strokes Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Head Energizing Strokes Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetAutocutterOperationsNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Autocutter Operations Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Autocutter Operations Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetPrinterOperationPeriod(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Printer Operation Period = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Printer Operation Period fail = " + result + "\r\n");
            }

            //readNum = -1;
            //int clearType = 0;//参数0-3 分别对应清除走纸数，头部通电数，自动切刀操作次数，打印机操作周数次数。
            //result = DllAPI.ClearPrinterMileage(printer, clearType);
            //if (Constants.STS_NORMAL == result)
            //{
            //    strEndInfomation.Append("Clear Printing Mileage success "+ "\r\n");
            //}
            //else
            //{
            //    strEndInfomation.Append("Clear Printing Mileage success fail"+ "\r\n");
            //}      

            readNum = -1;
            result = 1;
            result = DllAPI.GetOverTemperatureErrorReportNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Over Temperature Error Report Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Over Temperature Error Report Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetPrinterPointsNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Printer Points Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Printer Points Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetCutterErrorNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Cutter Error Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Cutter Error Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetPowerOnOpenCoverNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Power On Open Cover Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Power On Open Cover Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetHalfCutNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Half Cut Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Half Cut Number fail = " + result + "\r\n");
            }

            readNum = -1;
            result = 1;
            result = DllAPI.GetTotalCutNumber(printer, ref readNum);
            if (Constants.STS_NORMAL == result)
            {
                strEndInfomation.Append("Get Total Cut Number = " + readNum + "\r\n");
            }
            else
            {
                strEndInfomation.Append("Get Total Cut Number fail = " + result + "\r\n");
            }

            //readNum = -1;
            //result = DllAPI.ClearPrinterMileage2(printer);
            //if (Constants.STS_NORMAL == result)
            //{
            //    strEndInfomation.Append("Clear Printing Mileage2 success " + "\r\n");
            //}
            //else
            //{
            //    strEndInfomation.Append("Clear Printing Mileage2 success fail" + "\r\n");
            //}

            MessageBox.Show(strEndInfomation.ToString());
        }

        private void btnSn_Click(object sender, EventArgs e)
        {
            byte[] arrSn = new byte[30];
            int snLenth = 0;
            if (Constants.E_SUCCESS == DllAPI.GetPrinterSN(printer, arrSn,ref snLenth))
            {
                string strData = System.Text.Encoding.UTF8.GetString(arrSn);
                MessageBox.Show("Printer SN:" + strData);
            }
            else
            {
                MessageBox.Show("Get Printer SN Fail:");
            }
        }
    }
}

