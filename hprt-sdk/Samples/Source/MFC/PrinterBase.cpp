#include "stdafx.h"
#include "PrinterBase.h"

/////////////////////////////////////
//define 
////////////////////////////////////

 FormatError									DemFormatError;
 PrinterCreator							        DemPrinterCreator;
 PrinterCreatorS							    DemPrinterCreatorS;
 PortOpen										DemPortOpen;
 PortClose										DemPortClose;
 PrinterDestroy								    DemPrinterDestroy;
 DirectIO										DemDirectIO;

 PrinterInitialize							    DemPrinterInitialize;
 FeedLine										DemFeedLine;
 SetAlign                                       DemSetAlign;
 PrintText									    DemPrintText;
 PrintTextS									    DemPrintTextS;
 PrintBarCode								    DemPrintBarCode;
 PrintSymbol									DemPrintSymbol;
 CutPaper										DemCutPaper;
 OpenCashDrawer                                 DemOpenCashDrawer;
 SelectStandardMode							    DemSelectStandardMode;
 SetTextLineSpace								DemSetTextLineSpace;
 SetTextBold                                    DemSetTextBold;
 SetTextFont                                    DemSetTextFont;
 SelectPageMode								    DemSelectPageMode;
 SetPrintAreaInPageMode						    DemSetPrintAreaInPageMode;
 CancelPrintDataInPageMode                      DemCancelPrintDataInPageMode;
 SelectPrintDirectionInPageMode				    DemSelectPrintDirectionInPageMode;
 SetAbsolutePrintPosition						DemSetAbsolutePrintPosition;
 SetAbsoluteVerticalPrintPositionInPageMode	    DemSetAbsoluteVerticalPrintPositionInPageMode;
 PrintAndReturnStandardMode					    DemPrintAndReturnStandardMode;
 PositionNextLabel								DemPositionNextLabel;
 PrintDataInPageMode							DemPrintDataInPageMode;
 GetPrinterState                                DemGetPrinterState;
 SetHorizontalAndVerticalMotionUnits            DemSetHorizontalAndVerticalMotionUnits;
 SetCodePage                                    DemSetCodePage;
 SetBuzzer                                      DemSetBuzzer;
 SetInternationalCharacter                      DemSetInternationalCharacter;
 SetPrintSpeed                                  DemSetPrintSpeed;
 DefineNVImageCompatible					    DemDefineNVImageCompatible;
 PrintNVImageCompatible						    DemPrintNVImageCompatible;
 DefineDownloadedImageCompatible		        DemDefineDownloadedImageCompatible;
 PrintDownloadedImageCompatible				    DemPrintDownloadedImageCompatible;
 PrintImage									    DemPrintImage;
 DefineNVImage								    DemDefineNVImage;
 PrintNVImage									DemPrintNVImage;
 DefineBufferedImage							DemDefineBufferedImage;
 PrintBufferedImage							    DemPrintBufferedImage;
 DeleteAllNVImages                              DemDeleteAllNVImages;
 GetFirmwareVersion                             DemGetFirmwareVersion;
 GetCashDrawerState                             DemGetCashDrawerState;
 ClearBuffer                                    DemClearBuffer;
 PrintTwoQRCode                                 DemPrintTwoQRCode;
 WriteData                                      DemWriteData;
 ReadData                                       DemReadData;

GetPaperFeedLinesNumber                         DemGetPaperFeedLinesNumber;
GetHeadEnergizingStrokesNumber                  DemGetHeadEnergizingStrokesNumber;
ClearPrinterMileage							    DemClearPrinterMileage;
GetAutocutterOperationsNumber                   DemGetAutocutterOperationsNumber;
GetPrinterOperationPeriod                       DemGetPrinterOperationPeriod;

GetOverTemperatureErrorReportNumber             DemGetOverTemperatureErrorReportNumber;
GetPrinterPointsNumber							DemGetPrinterPointsNumber;
GetCutterErrorNumber							DemGetCutterErrorNumber;
GetPowerOnOpenCoverNumber                       DemGetPowerOnOpenCoverNumber;
GetHalfCutNumber								DemGetHalfCutNumber;
GetTotalCutNumber								DemGetTotalCutNumber;
ClearPrinterMileage2                            DemClearPrinterMileage2;
GetPrinterSN									DemGetPrinterSN;

void*			hprinter;
HMODULE			m_hDll;

void UnloadDll()
{
	FreeLibrary(m_hDll);
}

BOOL LoadDll()
{
	m_hDll = LoadLibrary(_T("ESC_SDK.dll"));	

	if(m_hDll == 0)
		return FALSE;

	DemFormatError = (FormatError)GetProcAddress(m_hDll, "FormatError");
	DemPrinterCreator = (PrinterCreator)GetProcAddress(m_hDll, "PrinterCreator");
	DemPrinterCreatorS = (PrinterCreatorS)GetProcAddress(m_hDll, "PrinterCreatorS");
	DemPortOpen = (PortOpen)GetProcAddress(m_hDll, "PortOpen");
	DemPortClose = (PortClose)GetProcAddress(m_hDll, "PortClose");
	DemPrinterDestroy = (PrinterDestroy)GetProcAddress(m_hDll, "PrinterDestroy");
	DemDirectIO = (DirectIO)GetProcAddress(m_hDll, "DirectIO");

	DemPrinterInitialize = (PrinterInitialize)GetProcAddress(m_hDll, "PrinterInitialize");
	DemFeedLine = (FeedLine)GetProcAddress(m_hDll, "FeedLine");
	DemSetAlign = (SetAlign)GetProcAddress(m_hDll, "SetAlign");
	DemPrintText = (PrintText)GetProcAddress(m_hDll, "PrintText");
	DemPrintTextS = (PrintTextS)GetProcAddress(m_hDll, "PrintTextS");

	DemPrintBarCode = (PrintBarCode)GetProcAddress(m_hDll, "PrintBarCode");
	DemPrintSymbol = (PrintSymbol)GetProcAddress(m_hDll, "PrintSymbol");
	DemCutPaper = (CutPaper)GetProcAddress(m_hDll, "CutPaper");
	DemOpenCashDrawer = (OpenCashDrawer)GetProcAddress(m_hDll, "OpenCashDrawer");
	DemSelectStandardMode = (SelectStandardMode)GetProcAddress(m_hDll, "SelectStandardMode");
	DemSetTextLineSpace = (SetTextLineSpace)GetProcAddress(m_hDll, "SetTextLineSpace");
	DemSetTextBold = (SetTextBold)GetProcAddress(m_hDll, "SetTextBold");
	DemSetTextFont = (SetTextFont)GetProcAddress(m_hDll, "SetTextFont");
	DemSelectPageMode = (SelectPageMode)GetProcAddress(m_hDll, "SelectPageMode");
	DemSetPrintAreaInPageMode = (SetPrintAreaInPageMode)GetProcAddress(m_hDll, "SetPrintAreaInPageMode");
	DemCancelPrintDataInPageMode = (CancelPrintDataInPageMode)GetProcAddress(m_hDll, "CancelPrintDataInPageMode");
	DemSelectPrintDirectionInPageMode = (SelectPrintDirectionInPageMode)GetProcAddress(m_hDll, "SelectPrintDirectionInPageMode");
	DemSetAbsolutePrintPosition = (SetAbsolutePrintPosition)GetProcAddress(m_hDll, "SetAbsolutePrintPosition");
	DemSetAbsoluteVerticalPrintPositionInPageMode = (SetAbsoluteVerticalPrintPositionInPageMode)GetProcAddress(m_hDll, "SetAbsoluteVerticalPrintPositionInPageMode");

	DemPrintAndReturnStandardMode = (PrintAndReturnStandardMode)GetProcAddress(m_hDll, "PrintAndReturnStandardMode");
	DemPositionNextLabel = (PositionNextLabel)GetProcAddress(m_hDll, "PositionNextLabel");
	DemPrintDataInPageMode = (PrintDataInPageMode)GetProcAddress(m_hDll, "PrintDataInPageMode");
	DemGetPrinterState = (GetPrinterState)GetProcAddress(m_hDll, "GetPrinterState");
	DemSetHorizontalAndVerticalMotionUnits = (SetHorizontalAndVerticalMotionUnits)GetProcAddress(m_hDll, "SetHorizontalAndVerticalMotionUnits");
	DemSetCodePage = (SetCodePage)GetProcAddress(m_hDll, "SetCodePage");
	DemSetBuzzer = (SetBuzzer)GetProcAddress(m_hDll, "SetBuzzer");
	DemSetInternationalCharacter = (SetInternationalCharacter)GetProcAddress(m_hDll, "SetInternationalCharacter");
	DemSetPrintSpeed = (SetPrintSpeed)GetProcAddress(m_hDll, "SetPrintSpeed");

	DemDefineNVImageCompatible = (DefineNVImageCompatible)GetProcAddress(m_hDll, "DefineNVImageCompatible");
	DemPrintNVImageCompatible = (PrintNVImageCompatible)GetProcAddress(m_hDll, "PrintNVImageCompatible");
	DemDefineDownloadedImageCompatible = (DefineDownloadedImageCompatible)GetProcAddress(m_hDll, "DefineDownloadedImageCompatible");
	DemPrintDownloadedImageCompatible = (PrintDownloadedImageCompatible)GetProcAddress(m_hDll, "PrintDownloadedImageCompatible");
	DemPrintImage = (PrintImage)GetProcAddress(m_hDll, "PrintImage");
	DemDefineNVImage = (DefineNVImage)GetProcAddress(m_hDll, "DefineNVImage");
	DemPrintNVImage = (PrintNVImage)GetProcAddress(m_hDll, "PrintNVImage");
	DemDefineBufferedImage = (DefineBufferedImage)GetProcAddress(m_hDll, "DefineBufferedImage");
	DemPrintBufferedImage = (PrintBufferedImage)GetProcAddress(m_hDll, "PrintBufferedImage");
	DemDeleteAllNVImages = (DeleteAllNVImages)GetProcAddress(m_hDll, "DeleteAllNVImages");
	DemGetFirmwareVersion = (GetFirmwareVersion)GetProcAddress(m_hDll, "GetFirmwareVersion");
	DemGetCashDrawerState = (GetCashDrawerState)GetProcAddress(m_hDll, "GetCashDrawerState");
	DemClearBuffer = (ClearBuffer)GetProcAddress(m_hDll, "ClearBuffer");
	DemPrintTwoQRCode = (PrintTwoQRCode)GetProcAddress(m_hDll, "PrintTwoQRCode");
	DemWriteData = (WriteData)GetProcAddress(m_hDll,"WriteData");
	DemReadData = (ReadData)GetProcAddress(m_hDll,"ReadData");

	DemGetPaperFeedLinesNumber = (GetPaperFeedLinesNumber)GetProcAddress(m_hDll, "GetPaperFeedLinesNumber");
	DemGetHeadEnergizingStrokesNumber = (GetHeadEnergizingStrokesNumber)GetProcAddress(m_hDll, "GetHeadEnergizingStrokesNumber");
	DemClearPrinterMileage = (ClearPrinterMileage)GetProcAddress(m_hDll, "ClearPrinterMileage");
	DemGetAutocutterOperationsNumber = (GetAutocutterOperationsNumber)GetProcAddress(m_hDll, "GetAutocutterOperationsNumber");
	DemGetPrinterOperationPeriod = (GetPrinterOperationPeriod)GetProcAddress(m_hDll, "GetPrinterOperationPeriod");

	DemGetOverTemperatureErrorReportNumber = (GetOverTemperatureErrorReportNumber)GetProcAddress(m_hDll, "GetOverTemperatureErrorReportNumber");
	DemGetPrinterPointsNumber = (GetPrinterPointsNumber)GetProcAddress(m_hDll, "GetPrinterPointsNumber");
	DemGetCutterErrorNumber = (GetCutterErrorNumber)GetProcAddress(m_hDll, "GetCutterErrorNumber");
	DemGetPowerOnOpenCoverNumber = (GetPowerOnOpenCoverNumber)GetProcAddress(m_hDll, "GetPowerOnOpenCoverNumber");
	DemGetHalfCutNumber = (GetHalfCutNumber)GetProcAddress(m_hDll, "GetHalfCutNumber");
	DemGetTotalCutNumber = (GetTotalCutNumber)GetProcAddress(m_hDll, "GetTotalCutNumber"); 
	DemClearPrinterMileage2 = (ClearPrinterMileage2)GetProcAddress(m_hDll, "ClearPrinterMileage2");

	DemGetPrinterSN = (GetPrinterSN)GetProcAddress(m_hDll, "GetPrinterSN");

	return TRUE;
}
