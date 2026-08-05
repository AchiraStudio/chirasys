
// PRTMFCDemoDlg.cpp : 实现文件
//

#include "stdafx.h"
#include "MFCDemo.h"
#include "MFCDemoDlg.h"
#include "afxdialogex.h"
#include "PrinterBase.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

// 用于应用程序“关于”菜单项的 CAboutDlg 对话框

class CAboutDlg : public CDialogEx
{
public:
	CAboutDlg();

// 对话框数据
	enum { IDD = IDD_ABOUTBOX };

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV 支持

// 实现
protected:
	DECLARE_MESSAGE_MAP()
};

CAboutDlg::CAboutDlg() : CDialogEx(CAboutDlg::IDD)
{
}

void CAboutDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CAboutDlg, CDialogEx)
END_MESSAGE_MAP()


// CPRTMFCDemoDlg 对话框




CPRTMFCDemoDlg::CPRTMFCDemoDlg(CWnd* pParent /*=NULL*/)
	: CDialogEx(CPRTMFCDemoDlg::IDD, pParent)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
}

void CPRTMFCDemoDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CPRTMFCDemoDlg, CDialogEx)
	ON_WM_SYSCOMMAND()
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_BN_CLICKED(IDC_PORTOPEN, &CPRTMFCDemoDlg::OnBnClickedPortOpen)
	ON_BN_CLICKED(IDC_PRINTRECEIPT, &CPRTMFCDemoDlg::OnBnClickedPrintReceipt)
	ON_BN_CLICKED(IDC_STOP, &CPRTMFCDemoDlg::OnBnClickedStop)
	ON_BN_CLICKED(IDC_LABEL, &CPRTMFCDemoDlg::OnBnClickedLabel)
	ON_BN_CLICKED(IDC_STATUS, &CPRTMFCDemoDlg::OnBnClickedStatus)
	ON_BN_CLICKED(IDC_OTHER, &CPRTMFCDemoDlg::OnBnClickedOther)
	ON_BN_CLICKED(IDC_PRINTIMAGE, &CPRTMFCDemoDlg::OnBnClickedPrintimage)
	ON_CBN_SELCHANGE(IDC_PORTTYPE, &CPRTMFCDemoDlg::OnCBNPortSelChange)
	ON_BN_CLICKED(IDC_VERSION, &CPRTMFCDemoDlg::OnBnClickedVersion)
	ON_BN_CLICKED(IDC_WINDOWSFONT, &CPRTMFCDemoDlg::OnBnClickedWindowsfont)
	ON_EN_CHANGE(IDC_ADDRESS, &CPRTMFCDemoDlg::OnEnChangeAddress)
	ON_BN_CLICKED(IDC_WRITE, &CPRTMFCDemoDlg::OnBnClickedWrite)
	ON_EN_CHANGE(IDC_WRITEDATE, &CPRTMFCDemoDlg::OnEnChangeWritedate)
	ON_BN_CLICKED(IDC_READ, &CPRTMFCDemoDlg::OnBnClickedRead)
	ON_EN_CHANGE(IDC_READDATE, &CPRTMFCDemoDlg::OnEnChangeReaddate)
	ON_BN_CLICKED(IDC_NUMBER, &CPRTMFCDemoDlg::OnBnClickedNumber)
END_MESSAGE_MAP()


// CPRTMFCDemoDlg 消息处理程序

BOOL CPRTMFCDemoDlg::OnInitDialog()
{
	CDialogEx::OnInitDialog();

	// 将“关于...”菜单项添加到系统菜单中。

	// IDM_ABOUTBOX 必须在系统命令范围内。
	ASSERT((IDM_ABOUTBOX & 0xFFF0) == IDM_ABOUTBOX);
	ASSERT(IDM_ABOUTBOX < 0xF000);

	CMenu* pSysMenu = GetSystemMenu(FALSE);
	if (pSysMenu != NULL)
	{
		BOOL bNameValid;
		CString strAboutMenu;
		bNameValid = strAboutMenu.LoadString(IDS_ABOUTBOX);
		ASSERT(bNameValid);
		if (!strAboutMenu.IsEmpty())
		{
			pSysMenu->AppendMenu(MF_SEPARATOR);
			pSysMenu->AppendMenu(MF_STRING, IDM_ABOUTBOX, strAboutMenu);
		}
	}

	// 设置此对话框的图标。当应用程序主窗口不是对话框时，框架将自动
	//  执行此操作
	SetIcon(m_hIcon, TRUE);			// 设置大图标
	SetIcon(m_hIcon, FALSE);		// 设置小图标

	// TODO: 在此添加额外的初始化代码
	CEdit* pAddress = (CEdit*)GetDlgItem(IDC_ADDRESS);
	CEdit* pModel = (CEdit*)GetDlgItem(IDC_TXT_MODEL);
	CComboBox* pPort = (CComboBox*)GetDlgItem(IDC_PORTTYPE);
	CComboBox* pInfo = (CComboBox*)GetDlgItem(IDC_CMB_IMAGE);

	pPort->SetCurSel(3);
	pAddress->SetWindowText(_T("USB"));
	pModel->SetWindowText(_T("TP806"));
	pInfo->SetCurSel(0);

	return TRUE;  // 除非将焦点设置到控件，否则返回 TRUE
}

void CPRTMFCDemoDlg::OnSysCommand(UINT nID, LPARAM lParam)
{
	if ((nID & 0xFFF0) == IDM_ABOUTBOX)
	{
		CAboutDlg dlgAbout;
		dlgAbout.DoModal();
	}
	else
	{
		CDialogEx::OnSysCommand(nID, lParam);
	}
}

// 如果向对话框添加最小化按钮，则需要下面的代码
//  来绘制该图标。对于使用文档/视图模型的 MFC 应用程序，
//  这将由框架自动完成。

void CPRTMFCDemoDlg::OnPaint()
{
	if (IsIconic())
	{
		CPaintDC dc(this); // 用于绘制的设备上下文

		SendMessage(WM_ICONERASEBKGND, reinterpret_cast<WPARAM>(dc.GetSafeHdc()), 0);

		// 使图标在工作区矩形中居中
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// 绘制图标
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialogEx::OnPaint();
	}
}

//当用户拖动最小化窗口时系统调用此函数取得光标
//显示。
HCURSOR CPRTMFCDemoDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}

///////////////////////////
//打印机相关操作
///////////////////////////
BOOL PrinterState()
{
    UINT state;
	int Result;
	CString strerror;

	if (E_SUCCESS == (Result = DemGetPrinterState(hprinter, &state)))
	{
		if (0x01 == (state & 0x01))
		{
			AfxMessageBox(_T("Printer paper not present,please insert the printing paper."));
			return false;
		}
		if (0x02 == (state & 0x02))
		{
			AfxMessageBox(_T("Printer paper cover open,please check paper cover."));
			return false;
		}
		if (0x04 == (state & 0x04))
		{
			AfxMessageBox(_T("Printer paper near end,please insert the printing paper."));
		}
		if (0x08 == (state & 0x08))
		{
			//to do
		}
		if (0x10 == (state & 0x10))
		{
			//to do
		}
		if (0x20 == (state & 0x20))
		{
			AfxMessageBox(_T("Printer state error."));
			return false;
		}
		if (0x40 == (state & 0x40))
		{
		   AfxMessageBox(_T("Printer not open."));
			return false;
		}
		if (0x40 == (state & 0x40))
		{
			AfxMessageBox(_T("Printer offline,please check printer state."));
			return false;
		}

		if (0x100 == (state & 0x100))
		{
			AfxMessageBox(_T("Printer busy."));
			return false;
		}
		
	}
	else
	{
		strerror.Format(_T("Printer error!\r\nerror code: %d"),Result);
		AfxMessageBox(strerror);
		return false;
	}

	return true;

}


CString GetFormatError(int Result)
{
	int langid = 0;
	char temp[1024];

	DemFormatError(Result, langid, temp, 0, 1024);
	CString str;
	str.Format(_T("%s"), temp);
	return str;

}


void CPRTMFCDemoDlg::OnBnClickedPortOpen()
{	
	UpdateData(TRUE);
	CString modelsetting;
	CString portsetting;
	CString strError;
	int Result = -1;

	GetDlgItemText(IDC_TXT_MODEL,modelsetting);
	GetDlgItemText(IDC_ADDRESS,portsetting);
	if (E_SUCCESS != (Result = DemPrinterCreator(&hprinter, modelsetting)))
	{
		strError = GetFormatError(Result);
        hprinter = NULL;
		AfxMessageBox(strError);
		return;
	}
			
	if(Result==E_SUCCESS)
	{
		if (E_SUCCESS != (Result = DemPortOpen(hprinter, portsetting)))
		{
			strError = GetFormatError(Result);
			AfxMessageBox(strError);
			return;
		}
		DemSetInternationalCharacter(hprinter, CHARACTERSET_DEFAULT);
	}

	//激活按钮
	SetItemsEnable(TRUE);

	#ifdef UNICODE
	
	GetDlgItem(IDC_WRITE)->EnableWindow(false);
	GetDlgItem(IDC_READ)->EnableWindow(false);

	#endif

}

void CPRTMFCDemoDlg::OnBnClickedStop()
{
	DemPortClose(hprinter);
	//按钮置灰
	SetItemsEnable(FALSE);
}

void CPRTMFCDemoDlg::OnBnClickedPrintReceipt()
{
	if(m_hDll!=NULL)
	{
	
			if (PrinterState())
			{
				DemPrinterInitialize(hprinter);
				DemPrintText(hprinter, _T("\n"), TEXT_ALIGNMENT_CENTER, TEXT_NORMAL_MODE, TEXT_SIZE_1WIDTH | TEXT_SIZE_1HEIGHT);
				//PrintNVImageCompatible(hprinter, 1, 3);
				DemPrintText(hprinter, _T("WELCOME\n"), TEXT_ALIGNMENT_CENTER, TEXT_NORMAL_MODE, TEXT_SIZE_1WIDTH | TEXT_SIZE_1HEIGHT);
				DemPrintText(hprinter, _T("Receipt:270500027                Cashier:01012\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("----------------------------------------------\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("  Commodity Code         Price        Quantity\n"), TEXT_ALIGNMENT_LEFT, TEXT_FONT_EMPHASIZED | TEXT_FONT_UNDERLINE_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("01.9940228004700          3.98           1.181\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("   banana                       subtotal:4.70 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("02.996100800220           6.00           0.376\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("   noodle                       subtotal:2.20 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("03.6921644701204          3.50           1    \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("   fruit juice                  subtotal:3.50 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("04.9940316000602          5.16           0.116\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("   flour                        subtotal:0.60 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("----------------------------------------------\n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Total:                  RMB             11.00 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Payment:                RMB            101.00 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Change:                 RMB             90.00 \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Sold Quantity:                           4    \n"), TEXT_ALIGNMENT_LEFT, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("  13th,Sep,2014   16:50:19\n"), TEXT_ALIGNMENT_CENTER, TEXT_NORMAL_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Thank you for patronizing\n"), TEXT_ALIGNMENT_CENTER, TEXT_FONT_UNDERLINE_MODE, TEXT_SIZE_0WIDTH | TEXT_SIZE_0HEIGHT);
				DemPrintText(hprinter, _T("Wal-Mart\n"), TEXT_ALIGNMENT_CENTER, TEXT_FONT_REVERSE, TEXT_SIZE_1WIDTH | TEXT_SIZE_0HEIGHT);
				DemPositionNextLabel(hprinter);
				DemCutPaper(hprinter,0,3);
			}
		}
}


void CPRTMFCDemoDlg::OnBnClickedLabel()
{
	double vMotion = 0.0625, hMotion = 0.125;    // distance per dot
    int pageWidth = 72, pageHeight = 500;        // mm
    int width_dots = (int)(pageWidth / hMotion);
    int height_dots = (int)(pageHeight / vMotion);
 

	if(PrinterState())
	{
		DemPrinterInitialize(hprinter);
		DemSelectPageMode(hprinter);

		DemSetPrintAreaInPageMode(hprinter, 0, 0, width_dots, height_dots);
		DemSelectPrintDirectionInPageMode(hprinter, 0);

		//// print Barcode: Code128
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 96);
		DemPrintBarCode(hprinter,BARCODE_CODE128,_T("{A110123456789"), 1, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);


		//// print Barcode: Code13
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 300);
		DemPrintBarCode(hprinter, BARCODE_EAN13, _T("2501138000002"), 2, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);


		// print QRCode
		DemSetAbsolutePrintPosition(hprinter,20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter,400);
		DemPrintBarCode(hprinter,SYMBOL_QRCODE1,_T("QRCODE 1  654321"),2, 60,TEXT_ALIGNMENT_LEFT,BARCODE_HRI_NONE);

		//// print QRCode
		DemSetAbsolutePrintPosition(hprinter, 220);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 400);
		DemPrintBarCode(hprinter, SYMBOL_QRCODE2, _T("QRCODE 2  123456"), 2, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_NONE);


		// print PDF417
		DemSetAbsolutePrintPosition(hprinter,0);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter,950);
		DemPrintSymbol(hprinter,SYMBOL_STANDARD_PDF417, _T("China 0123456 ABC +_*&"),PDF417_ERROR_CORRECTION_LEVEL_0,3,3,TEXT_ALIGNMENT_LEFT); 
		
		//// print UPC-A
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter,1150);
		DemPrintBarCode(hprinter, BARCODE_UPC_A, _T("023150456784"), 2, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);

		//// print UPC-E
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 1350);
		DemPrintBarCode(hprinter, BARCODE_UPC_E, _T("01220000899"), 2, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);


		//// print EAN8
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 1550);
		DemPrintBarCode(hprinter, BARCODE_EAN8, _T("1542656"), 2, 60, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);

		//// print CODE39
		DemSetAbsolutePrintPosition(hprinter, 20);
		DemSetAbsoluteVerticalPrintPositionInPageMode(hprinter, 1850);
		DemPrintBarCode(hprinter, BARCODE_CODE39, _T("*10401YY00002009*"), 2, 100, TEXT_ALIGNMENT_LEFT, BARCODE_HRI_BELOW);

		DemPrintAndReturnStandardMode(hprinter);
	}
}

void CPRTMFCDemoDlg::OnBnClickedStatus()
{
	//之前的代码  现在先用来测试cxy的五个接口
	UINT state;
	DemGetPrinterState(hprinter, &state);
	if(E_SUCCESS == state)
		AfxMessageBox(_T("Printer state normal."));
	else
		PrinterState();

}

void CPRTMFCDemoDlg::OnBnClickedOther()
{
	BYTE UserCMD[3]={ 0x1D, 0x72, 0x01 };
	UINT readnum = 0;
	BYTE readdata[1];
	CString strdata;
	DemDirectIO(hprinter, UserCMD, 3, readdata, 1, &readnum);
	if (readnum > 0)
    {
		CEdit* pInfo = (CEdit*)GetDlgItem(IDC_EDIT_INFO);
        pInfo->SetWindowText(_T(""));
        for (UINT i = 0; i < readnum; i++)
        {
			strdata.Format(_T("%X"),readdata[0]);
			pInfo->SetWindowText(strdata);
        }
    }
}


void CPRTMFCDemoDlg::OnBnClickedPrintimage()
{
	CString FilePathName;	 
	CComboBox* pImage = (CComboBox*)GetDlgItem(IDC_CMB_IMAGE);
	CString strCBText;
	
	int nIndex = pImage->GetCurSel();
	pImage->GetLBText(nIndex,strCBText);

	if(PrinterState())
	{
		CFileDialog dlg(TRUE,NULL,NULL,OFN_HIDEREADONLY | OFN_OVERWRITEPROMPT,_T("Image files|*.bmp;*.gif;*.jpg;*.png;"),NULL);
		if(dlg.DoModal()==IDOK)
		{
			FilePathName=dlg.GetPathName(); 
			
			if("PrintImage"==strCBText)
				DemPrintImage(hprinter, FilePathName, 0);
			else if ("BufferedImage" == strCBText)
			{
				DemDefineBufferedImage(hprinter, FilePathName);
				DemPrintBufferedImage(hprinter);
			}
			else if ("NVImage" == strCBText)
			{
				DemDefineNVImage(hprinter, FilePathName,'1','1');
				DemPrintNVImage(hprinter, '1', '1');
			}
		}	
	}
}


void CPRTMFCDemoDlg::OnCBNPortSelChange()
{
	CComboBox* pPort = (CComboBox*)GetDlgItem(IDC_PORTTYPE);
	CEdit* pAddress = (CEdit*)GetDlgItem(IDC_ADDRESS);
	CString strCBText;
	int nIndex = pPort->GetCurSel();
	
	pPort->GetLBText(nIndex,strCBText);
	if("USB"==strCBText)
		pAddress->SetWindowText(_T("USB"));
	else if("COM"==strCBText)
		pAddress->SetWindowText(_T("COM1,BAUDRATE_19200"));
	else if("NET"==strCBText)
		pAddress->SetWindowText(_T("Net,192.168.0.2"));
	else if("LPT"==strCBText)
		pAddress->SetWindowText(_T("LPT1"));
	else
		pAddress->SetWindowText(_T("Invalid"));
}

void CPRTMFCDemoDlg::SetItemsEnable(bool Enable)
{
	GetDlgItem(IDC_PORTOPEN)->EnableWindow(!Enable);
	GetDlgItem(IDC_PORTTYPE)->EnableWindow(!Enable);
	GetDlgItem(IDC_ADDRESS)->EnableWindow(!Enable);
	GetDlgItem(IDC_TXT_MODEL)->EnableWindow(!Enable);

	GetDlgItem(IDC_PRINTRECEIPT)->EnableWindow(Enable);
	GetDlgItem(IDC_LABEL)->EnableWindow(Enable);
	GetDlgItem(IDC_STATUS)->EnableWindow(Enable);
	GetDlgItem(IDC_OTHER)->EnableWindow(Enable);
	GetDlgItem(IDC_STOP)->EnableWindow(Enable);
	GetDlgItem(IDC_PRINTIMAGE)->EnableWindow(Enable);
	GetDlgItem(IDC_WINDOWSFONT)->EnableWindow(Enable);
	GetDlgItem(IDC_VERSION)->EnableWindow(Enable);
	GetDlgItem(IDC_CMB_IMAGE)->EnableWindow(Enable);
	GetDlgItem(IDC_WRITE)->EnableWindow(Enable);
	GetDlgItem(IDC_READ)->EnableWindow(Enable);
	GetDlgItem(IDC_NUMBER)->EnableWindow(Enable);
}




void CPRTMFCDemoDlg::OnBnClickedVersion()
{
	int version[3]={0};
	char arrSn[64] = { 0 };
	int snLenth = 0;
	CString strVer;
	if(PrinterState())
	{
		if (E_SUCCESS == DemGetFirmwareVersion(hprinter, version, 3))
		{
			strVer.Format(_T("Printer FirmwareVersion:%d.%d.%d"),version[0],version[1],version[2]);
			//AfxMessageBox(strVer);
		}
		if (E_SUCCESS == DemGetPrinterSN(hprinter, arrSn, &snLenth))
		{	
			strVer += (_T("\r\n SN:"));
			for (int i = 0; i < snLenth; i++)
			{
				strVer += arrSn[i];
			}
		}
		AfxMessageBox(strVer);
	}
}
//图片格式
int	GetEncoderClsid(const WCHAR* format,CLSID* pClsid) 
 { 
	UINT num   =   0;                     //   number   of   image   encoders 
	UINT size   =   0;                   //   size   of   the   image   encoder   array   in   bytes 

	ImageCodecInfo* pImageCodecInfo = NULL; 

	GetImageEncodersSize(&num, &size); 
	if(size   ==   0) 
	return -1;     //   Failure 

	pImageCodecInfo = (ImageCodecInfo*)(malloc(size)); 
	if(pImageCodecInfo == NULL) 
	return -1;     //   Failure 

	GetImageEncoders(num, size, pImageCodecInfo); 

	for(UINT j = 0;j < num;++j) 
	{ 
		if(wcscmp(pImageCodecInfo[j].MimeType,format)==0) 
		{ 
			*pClsid = pImageCodecInfo[j].Clsid; 
			free(pImageCodecInfo); 
			return j;     //   Success 
		}         
	} 

	free(pImageCodecInfo); 
	return -1;     //   Failure 
 }

void PrintText2Image(CString ImagePath,CString Text,int FontMode,int FontSize)
{
	int imX = 384;   //宽和高
    int imY = FontSize*2;
 
    Gdiplus::Bitmap mImg( imX, imY );  //创建图片
 
    Graphics* g = Graphics::FromImage( &mImg );  //图像获得绘图句柄
	g->Clear(Color(255,255,255));
    //g->SetPageUnit( UnitWorld ); //设置画面单位
	Gdiplus::Font myFont(L"楷体",(REAL)FontSize,FontMode );
     
	SolidBrush blackBrush( Color( 0,0,0));
     
    PointF orL;  //初始绘图位置
    orL.X = 0;
    orL.Y = 5;
    g->DrawString(Text.AllocSysString(),Text.GetLength(), &myFont, orL, &blackBrush );
     
    CLSID pngClsid;
    GetEncoderClsid( L"image/bmp", &pngClsid );  //取得jpg/png/bmp的编码ID---http://msdn.microsoft.com/en-us/library/ms533843(VS.85).aspx
     
	mImg.Save(ImagePath.AllocSysString(), &pngClsid, NULL);  //保存

	DemPrintImage(hprinter, ImagePath, 0);
}

void CPRTMFCDemoDlg::OnBnClickedWindowsfont()
{
	CString Image = _T("\\sample.bmp");
	CString path; 
    GetModuleFileName(NULL,path.GetBufferSetLength(MAX_PATH+1),MAX_PATH); 
    path.ReleaseBuffer(); 
    int pos = path.ReverseFind('\\'); 
    path = path.Left(pos); 
	path = path+Image;

	if(PrinterState())
	{
		PrintText2Image(path,_T("打印测试"),FontStyleRegular,30);
		PrintText2Image(path,_T(" اختبار الطباعة "),FontStyleBold,30);
		PrintText2Image(path,_T("กรุณาเปิดดูวิดีโอใ"),FontStyleUnderline,30);
		PrintText2Image(path,_T("프린터 시험"),FontStyleStrikeout,40);
	}
}



void CPRTMFCDemoDlg::OnEnChangeAddress()
{
	// TODO:  如果该控件是 RICHEDIT 控件，它将不
	// 发送此通知，除非重写 CDialogEx::OnInitDialog()
	// 函数并调用 CRichEditCtrl().SetEventMask()，
	// 同时将 ENM_CHANGE 标志“或”运算到掩码中。

	// TODO:  在此添加控件通知处理程序代码
}


void CPRTMFCDemoDlg::OnBnClickedWrite()
{
	// TODO: 在此添加控件通知处理程序代码
		
	//获取写指令内容
	int Result = -1;
	int nNum = 0;
	CString strError;
	CString strWriteText;
	GetDlgItemText(IDC_WRITEDATE,strWriteText);	//获取edit内容
	strWriteText.Replace(_T(" "),NULL);//清除字符串所有空格
	int nWriteTextLenth = strWriteText.GetLength();
	unsigned char *ptrContain =(unsigned char*)strWriteText.GetBuffer(strWriteText.GetLength());
	unsigned char buff[128] = {0}; 
	for (int i=0;i<strWriteText.GetLength();i++)
	{
		nNum++;
		if (ptrContain[i] >= 'A' && ptrContain[i] <= 'F')
		{
			ptrContain[i] = ptrContain[i]-'A'+ 0x0A;
		}
		else if (ptrContain[i] >= 'a' && ptrContain[i] <= 'f')
		{
			ptrContain[i] = ptrContain[i]-'a'+ 0x0A;
		}
		else if (ptrContain[i] >= '0' && ptrContain[i] <= '9')
		{
			ptrContain[i] = ptrContain[i]-'0';
		}
		else
		{}
		if (nNum == 2)
		{
			nNum = 0;
			buff[i/2] = ptrContain[i-1]<<4 | ptrContain[i];//2字节合并成1字节并写入buff
		}
	}
	int nWriteNum = strWriteText.GetLength()/2;//传入的长度是原字符串长度的一半
	strWriteText.ReleaseBuffer();
	if (E_SUCCESS !=  (Result = DemWriteData(hprinter,buff,nWriteNum)))
	{
		strError = GetFormatError(Result);
        hprinter = NULL;
		AfxMessageBox(strError);
	}
	else
	{
		AfxMessageBox(_T("发送数据成功!"));
	}
}

void CPRTMFCDemoDlg::OnEnChangeWritedate()
{
	// TODO:  如果该控件是 RICHEDIT 控件，它将不
	// 发送此通知，除非重写 CDialogEx::OnInitDialog()
	// 函数并调用 CRichEditCtrl().SetEventMask()，
	// 同时将 ENM_CHANGE 标志“或”运算到掩码中。

	// TODO:  在此添加控件通知处理程序代码
	
}


void CPRTMFCDemoDlg::OnBnClickedRead()
{
	// TODO: 在此添加控件通知处理程序代码
	int Result = -1;
	int nPositon = 0;
	CString strError;
	CString strReadText;
	CString strReceiveDataNum;
	unsigned char readDate[512] = {0};
	char readStrDate[1025] = {0}; 
	unsigned int nReadDateLenth = 0;
	Result = DemReadData(hprinter,readDate,sizeof(readDate),&nReadDateLenth);
	for (int i=0;i<nReadDateLenth;i++)
	{
		sprintf(readStrDate+nPositon,"%02x", readDate[i]);
		nPositon+=2;
	}

	if (E_SUCCESS ==  Result || E_IO_READ_TIMEOUT == Result)
	{
		strReadText.Format(_T("%s"),readStrDate);
		CString strReadAddSpaceText;
		for (int i=0;i<nReadDateLenth*2;i++)
		{
			if (i%2 == 0)
			{
				strReadAddSpaceText += strReadText.Mid(i,2) + _T(" ");//将两两字符串用空格分开		
			}
		}
		GetDlgItem(IDC_READDATE)->SetWindowText(strReadAddSpaceText);//填充edit
		strReceiveDataNum.Format(_T("接受数据：%d"),nReadDateLenth);
		AfxMessageBox(strReceiveDataNum);
	}
	else
	{
		strError = GetFormatError(Result);
        hprinter = NULL;
		AfxMessageBox(strError);
		OnBnClickedStop();//报错之后hprinter为空不能再查询。
		return;
	}
}


void CPRTMFCDemoDlg::OnEnChangeReaddate()
{
	// TODO:  如果该控件是 RICHEDIT 控件，它将不
	// 发送此通知，除非重写 CDialogEx::OnInitDialog()
	// 函数并调用 CRichEditCtrl().SetEventMask()，
	// 同时将 ENM_CHANGE 标志“或”运算到掩码中。

	// TODO:  在此添加控件通知处理程序代码
}




void CPRTMFCDemoDlg::OnBnClickedNumber()
{
	// TODO: 在此添加控件通知处理程序代码
	unsigned int number = 0;
	int result = 0;
	CString strResultInfo;
	result = DemGetPaperFeedLinesNumber(hprinter, &number);
	
	if (number >= 0 && result == 0)
	{
		strResultInfo.Format(_T("GetPaperFeedLinesNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetPaperFeedLinesNumber fail = %d\r\n"), result);
	}

	result = DemGetHeadEnergizingStrokesNumber(hprinter, &number);
	//AfxMessageBox(_T("Printer state normal."));
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetHeadEnergizingStrokesNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetHeadEnergizingStrokesNumber fail = %d\r\n"), result);
	}

	//int clearType = 0;//清理参数0-3 分别清理走纸行数，头部通电数，自动切刀操作数，打印机操作周期数
	//result = DemClearPrinterMileage(hprinter, clearType);
	//if (result == 0)
	//{
	//	 strResultInfo.AppendFormat(_T("ClearPrinterMileage success\r\n"));
	//}
	//else
	//{
	//	strResultInfo.AppendFormat(_T("ClearPrinterMileage fail = %d\r\n"), result);
	//}

	result = DemGetAutocutterOperationsNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetAutocutterOperationsNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetAutocutterOperationsNumber fail = %d\r\n"), result);
	}


	result = DemGetPrinterOperationPeriod(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetPrinterOperationPeriod = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetPrinterOperationPeriod fail = %d\r\n"), result);
	}

	//过温报错次数统计
	result = 8888;
	result = DemGetOverTemperatureErrorReportNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetOverTemperatureErrorReportNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetOverTemperatureErrorReportNumber fail = %d\r\n"), result);
	}

	//打印点数的统计 
	result = 8888;
	result = DemGetPrinterPointsNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetPrinterPointsNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetPrinterPointsNumber fail = %d\r\n"), result);
	}

	//切刀错误统计
	result = 8888;
	result = DemGetCutterErrorNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetCutterErrorNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetCutterErrorNumber fail = %d\r\n"), result);
	}

	//上电开盖次数统计
	result = 8888;
	result = DemGetPowerOnOpenCoverNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetPowerOnOpenCoverNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetPowerOnOpenCoverNumber fail = %d\r\n"), result);
	}

	//半切次数统计
	result = 8888;
	result = DemGetHalfCutNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetHalfCutNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetHalfCutNumber fail = %d\r\n"), result);
	}

	//全切次数统计
	result = 8888;
	result = DemGetTotalCutNumber(hprinter, &number);
	if (number >= 0 && result == 0)
	{
		strResultInfo.AppendFormat(_T("GetTotalCutNumber = %d\r\n"), number);
	}
	else
	{
		strResultInfo.AppendFormat(_T("GetTotalCutNumber fail = %d\r\n"), result);
	}

	//result = DemClearPrinterMileage2(hprinter);
	//if (result == 0)
	//{
	//	strResultInfo.AppendFormat(_T("ClearPrinterMileage2 success"));
	//}
	//else
	//{
	//	strResultInfo.AppendFormat(_T("ClearPrinterMileage2 fail = %d\r\n"), result);
	//}

	AfxMessageBox(strResultInfo);
}
