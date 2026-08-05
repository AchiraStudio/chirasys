
#pragma once

/****************************************************************************
	CONST DEFINE
****************************************************************************/
#define E_SUCCESS			0		// no error
#define E_IO_READ_TIMEOUT	-332    //read timeout


//Text Align
#define TEXT_ALIGNMENT_LEFT    0
#define TEXT_ALIGNMENT_CENTER  1
#define TEXT_ALIGNMENT_RIGHT   2

//Text Font
#define TEXT_FONT_A            0
#define TEXT_FONT_B            1
#define TEXT_FONT_C            2

#define TEXT_SIZE_0WIDTH       0
#define TEXT_SIZE_1WIDTH       16
#define TEXT_SIZE_2WIDTH       32
#define TEXT_SIZE_3WIDTH       48
#define TEXT_SIZE_4WIDTH       64
#define TEXT_SIZE_5WIDTH       80
#define TEXT_SIZE_6WIDTH       96
#define TEXT_SIZE_7WIDTH       112

#define TEXT_SIZE_0HEIGHT      0
#define TEXT_SIZE_1HEIGHT      1
#define TEXT_SIZE_2HEIGHT      2
#define TEXT_SIZE_3HEIGHT      3
#define TEXT_SIZE_4HEIGHT      4
#define TEXT_SIZE_5HEIGHT      5
#define TEXT_SIZE_6HEIGHT      6
#define TEXT_SIZE_7HEIGHT      7

#define	TEXT_NORMAL_MODE            0
#define	TEXT_FONT_EMPHASIZED        2
#define	TEXT_FONT_UNDERLINE_MODE    4
#define	TEXT_FONT_REVERSE           8
#define	TEXT_FONT_DH_MODE           16
#define	TEXT_FONT_DW_MODE           32
#define	TEXT_FONT_DW_DH_MODE        48

/* Bar Code Type */
#define BARCODE_UPC_A      65
#define BARCODE_UPC_E	   66
#define BARCODE_EAN13      67
#define BARCODE_JAN13	   67
#define BARCODE_EAN8	   68
#define BARCODE_JAN8       68
#define BARCODE_CODE39     69
#define BARCODE_ITF        70
#define BARCODE_CODABAR    71
#define BARCODE_CODE93     72
#define BARCODE_CODE128    73

#define SYMBOL_STANDARD_PDF417		101
#define SYMBOL_TRUNCATED_PDF417		102
#define	SYMBOL_QRCODE1				103
#define	SYMBOL_QRCODE2				104
//PDF417 Code error correction level
#define PDF417_ERROR_CORRECTION_LEVEL_0  48
#define PDF417_ERROR_CORRECTION_LEVEL_1  49
#define PDF417_ERROR_CORRECTION_LEVEL_2  50
#define PDF417_ERROR_CORRECTION_LEVEL_3  51
#define PDF417_ERROR_CORRECTION_LEVEL_4  52
#define PDF417_ERROR_CORRECTION_LEVEL_5  53
#define PDF417_ERROR_CORRECTION_LEVEL_6  54
#define PDF417_ERROR_CORRECTION_LEVEL_7  55
#define PDF417_ERROR_CORRECTION_LEVEL_8  56

#define BARCODE_HRI_FONT_A  0
#define BARCODE_HRI_FONT_B  1

#define BARCODE_HRI_NONE   0
#define BARCODE_HRI_ABOVE  1
#define BARCODE_HRI_BELOW  2
#define BARCODE_HRI_BOTH   3

//Symbol model
#define SYMBOL_MODEL_1  49
#define SYMBOL_MODEL_2  50
//Symbol error correction level
#define SYMBOL_ERROR_CORRECTION_LEVEL_L  48
#define SYMBOL_ERROR_CORRECTION_LEVEL_M  49
#define SYMBOL_ERROR_CORRECTION_LEVEL_Q  50
#define SYMBOL_ERROR_CORRECTION_LEVEL_H  51
//Print Image Scale Mode
#define PRINT_IMAGE_NORMAL				0
#define PRINT_IMAGE_DOUBLE_WIDTH		1
#define PRINT_IMAGE_DOUBLE_HEIGHT		2
#define PRINT_IMAGE_QUADRUPLE			3

//Character Code Table

#define CHARACTERSET_DEFAULT           0
#define CHARACTERSET_USA               437
#define CHARACTERSET_MULTILINGUAL      850
#define CHARACTERSET_PORTUGUESE        860
#define CHARACTERSET_CANADIAN_FRENCH   863
#define CHARACTERSET_NORDIC            865
#define CHARACTERSET_WPC1252           1252
#define CHARACTERSET_CYRILLIC2         866
#define	CHARACTERSET_LATIN2            852
#define	CHARACTERSET_EURO              858

/******************************************************************************************
	IMPORT
******************************************************************************************/

void UnloadDll();
BOOL LoadDll();

#ifdef __cplusplus
#define PRINTER_API extern "C" __declspec(dllimport)
#else
#define PRINTER_WIN32_SDK_API __declspec(dllimport)
#endif

typedef int(__stdcall*FormatError)(int error_no, int langid, char* buf, int pos, int buf_size);
typedef int(__stdcall*PrinterCreator)(void** phandle, const  _TCHAR* model);
typedef void(__stdcall*PrinterCreatorS)(char* model);
typedef int(__stdcall*PortOpen)(void* handle, const _TCHAR*  io_settings);
typedef int(__stdcall*PortClose)(void* handle);
typedef int(__stdcall*PrinterDestroy)(void* handle);
typedef	int(__stdcall*DirectIO)(void* handle, unsigned char writedata[], unsigned int writenum, unsigned char readdata[], unsigned int readnum, unsigned int* preadednum);
typedef	int(__stdcall*ReadData)(void* handle, unsigned char* readData, unsigned int readNum, unsigned int* preadedNum);

typedef	int(__stdcall*WriteData)(void* handle, unsigned char* writeData, unsigned int writeNum);
typedef int(__stdcall*PrinterInitialize)(void* handle);
typedef int(__stdcall*FeedLine)(void* handle, int lines);
typedef int(__stdcall*SetAlign)(void* handle, int align);
typedef int(__stdcall*PrintText)(void* handle, const TCHAR* data, int alignment, int attribute, int textsize);
typedef int(__stdcall*PrintTextS)(void* handle, const TCHAR* data);
typedef int(__stdcall*PrintBarCode)(void* handle, int bctype, const TCHAR* data, int width, int height, int alignment, int HRI_position);
typedef int(__stdcall*PrintSymbol)(void* handle, int type, const TCHAR* data, int err_level, int width, int height, int alignment);
typedef int(__stdcall*CutPaper)(void* handle, int cut_mode, int distance);
typedef int(__stdcall*OpenCashDrawer)(void* handle, int pin_mode, int on_time, int off_time);
typedef int(__stdcall*SelectStandardMode)(void* handle);
typedef int(__stdcall*SetTextLineSpace)(void* handle, int linespace);
typedef int(__stdcall*SetTextBold)(void* handle, int bold);
typedef int(__stdcall*SetTextFont)(void* handle, int font);
typedef	int(__stdcall*SelectPageMode)(void* handle);
typedef	int(__stdcall*SetPrintAreaInPageMode)(void* handle, int horizontal, int vertical, int width, int height);
typedef	int(__stdcall*CancelPrintDataInPageMode)(void* handle);
typedef	int(__stdcall*SelectPrintDirectionInPageMode)(void* handle, int direction);
typedef	int(__stdcall*SetAbsolutePrintPosition)(void* handle, int position);
typedef	int(__stdcall*SetAbsoluteVerticalPrintPositionInPageMode)(void* handle, int position);
typedef	int(__stdcall*PrintAndReturnStandardMode)(void* handle);
typedef int(__stdcall*PositionNextLabel)(void* handle);
typedef	int(__stdcall*PrintDataInPageMode)(void* handle);
typedef	int(__stdcall*GetPrinterState)(void* handle, unsigned int* printer_state);
typedef int(__stdcall*SetHorizontalAndVerticalMotionUnits)(void* handle, int  Horizontal, int Vertical);
typedef int(__stdcall*SetCodePage)(void* handle, int codepage, int type);
typedef int(__stdcall*SetBuzzer)(void* handle, int enable);
typedef	int(__stdcall*SetInternationalCharacter)(void* handle, int characterset);
typedef	int(__stdcall*SetPrintSpeed)(void* handle, int speed);
typedef int(__stdcall*DefineNVImageCompatible)(void* handle, const TCHAR** imagepath_list, int imageqty);
typedef int(__stdcall*PrintNVImageCompatible)(void* handle, int imgno, int scalemode);
typedef int(__stdcall*DefineDownloadedImageCompatible)(void* handle, const TCHAR* imagepath);
typedef int(__stdcall*PrintDownloadedImageCompatible)(void* handle, int scalemode);
typedef int(__stdcall*PrintImage)(void* handle, const TCHAR* filename, int scalemode);
typedef int(__stdcall*PrintBitMapData)(void* handle, int scalemode, int width, int height,const TCHAR* filename);
typedef int(__stdcall*DefineNVImage)(void* handle, const TCHAR* imagepath, unsigned char kc1, unsigned char kc2);
typedef int(__stdcall*PrintNVImage)(void* handle, unsigned char kc1, unsigned char kc2);
typedef int(__stdcall*DefineBufferedImage)(void* handle, const TCHAR* imagepath);
typedef int(__stdcall*PrintBufferedImage)(void* handle);
typedef int(__stdcall*DeleteAllNVImages)(void* handle);
typedef	int(__stdcall*GetFirmwareVersion)(void* handle, int* version, int version_len);
typedef	int(__stdcall*GetCashDrawerState)(void* handle, int* drawerState);
typedef	int(__stdcall*ClearBuffer)(void* handle);
typedef	int(__stdcall*PrintTwoQRCode)(void* handle, const TCHAR* data1, int width1, int hAlign1, int vAlign1, const TCHAR* data2, int width2, int hAlign2, int vAlign2);
typedef	int(__stdcall*DrawRectangle)(void* handle, int xStart, int yStart, int xArea, int yArea, int lineWidth);
typedef	int(__stdcall*FirmwareUpgrade)(void* handle, const TCHAR* cFileName, const char* model, const char* ioSettings);

typedef	int(__stdcall*GetPaperFeedLinesNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetHeadEnergizingStrokesNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*ClearPrinterMileage)(void* handle,int clearType);
typedef	int(__stdcall*GetAutocutterOperationsNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetPrinterOperationPeriod)(void* handle, unsigned int* period);

typedef	int(__stdcall*GetOverTemperatureErrorReportNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetPrinterPointsNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetCutterErrorNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetPowerOnOpenCoverNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetHalfCutNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*GetTotalCutNumber)(void* handle, unsigned int* number);
typedef	int(__stdcall*ClearPrinterMileage2)(void* handle);
typedef int (__stdcall*GetPrinterSN)(void* handle, char* sn, int* snLenth);

extern void*			hprinter;
extern HMODULE			m_hDll;


extern FormatError									    DemFormatError;
extern PrinterCreator							        DemPrinterCreator;
extern PrinterCreatorS							        DemPrinterCreatorS;
extern PortOpen										    DemPortOpen;
extern PortClose										DemPortClose;
extern PrinterDestroy								    DemPrinterDestroy;
extern DirectIO										    DemDirectIO;

extern PrinterInitialize							    DemPrinterInitialize;
extern FeedLine										    DemFeedLine;
extern SetAlign                                         DemSetAlign;
extern PrintText									    DemPrintText;
extern PrintTextS									    DemPrintTextS;
extern PrintBarCode								    	DemPrintBarCode;
extern PrintSymbol									    DemPrintSymbol;
extern CutPaper										    DemCutPaper;
extern OpenCashDrawer                                   DemOpenCashDrawer;
extern SelectStandardMode							    DemSelectStandardMode;
extern SetTextLineSpace								    DemSetTextLineSpace;
extern SetTextBold                                      DemSetTextBold;
extern SetTextFont                                      DemSetTextFont;
extern SelectPageMode								    DemSelectPageMode;
extern SetPrintAreaInPageMode						    DemSetPrintAreaInPageMode;
extern CancelPrintDataInPageMode                        DemCancelPrintDataInPageMode;
extern SelectPrintDirectionInPageMode				    DemSelectPrintDirectionInPageMode;
extern SetAbsolutePrintPosition						    DemSetAbsolutePrintPosition;
extern SetAbsoluteVerticalPrintPositionInPageMode	    DemSetAbsoluteVerticalPrintPositionInPageMode;
extern PrintAndReturnStandardMode					    DemPrintAndReturnStandardMode;
extern PositionNextLabel								DemPositionNextLabel;
extern PrintDataInPageMode							    DemPrintDataInPageMode;
extern GetPrinterState                                  DemGetPrinterState;
extern SetHorizontalAndVerticalMotionUnits              DemSetHorizontalAndVerticalMotionUnits;
extern SetCodePage                                      DemSetCodePage;
extern SetBuzzer                                        DemSetBuzzer;
extern SetInternationalCharacter                        DemSetInternationalCharacter;
extern SetPrintSpeed                                    DemSetPrintSpeed;
extern DefineNVImageCompatible					        DemDefineNVImageCompatible;
extern PrintNVImageCompatible						    DemPrintNVImageCompatible;
extern DefineDownloadedImageCompatible				    DemDefineDownloadedImageCompatible;
extern PrintDownloadedImageCompatible				    DemPrintDownloadedImageCompatible;
extern PrintImage									    DemPrintImage;
extern DefineNVImage								    DemDefineNVImage;
extern PrintNVImage									    DemPrintNVImage;
extern DefineBufferedImage							    DemDefineBufferedImage;
extern PrintBufferedImage							    DemPrintBufferedImage;
extern DeleteAllNVImages                                DemDeleteAllNVImages;
extern GetFirmwareVersion                               DemGetFirmwareVersion;
extern GetCashDrawerState                               DemGetCashDrawerState;
extern ClearBuffer                                      DemClearBuffer;
extern PrintTwoQRCode                                   DemPrintTwoQRCode;
extern WriteData                                        DemWriteData;
extern ReadData                                         DemReadData;

extern GetPaperFeedLinesNumber                          DemGetPaperFeedLinesNumber;
extern GetHeadEnergizingStrokesNumber                   DemGetHeadEnergizingStrokesNumber;
extern ClearPrinterMileage                              DemClearPrinterMileage;
extern GetAutocutterOperationsNumber                    DemGetAutocutterOperationsNumber;
extern GetPrinterOperationPeriod                        DemGetPrinterOperationPeriod;

extern GetOverTemperatureErrorReportNumber              DemGetOverTemperatureErrorReportNumber;
extern GetPrinterPointsNumber							DemGetPrinterPointsNumber;
extern GetCutterErrorNumber								DemGetCutterErrorNumber;
extern GetPowerOnOpenCoverNumber                        DemGetPowerOnOpenCoverNumber;
extern GetHalfCutNumber									DemGetHalfCutNumber;
extern GetTotalCutNumber								DemGetTotalCutNumber;
extern ClearPrinterMileage2								DemClearPrinterMileage2;
extern GetPrinterSN										DemGetPrinterSN;