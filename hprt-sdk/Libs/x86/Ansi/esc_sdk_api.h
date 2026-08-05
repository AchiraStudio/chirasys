#ifndef _ESC_SDK_API_H_
#define _ESC_SDK_API_H_

#include "sdk_common_api.h"

#define SDK_VERSION     "1,4,1,3"

#ifdef __cplusplus
extern"C"
{
#endif

SDK_API int CALL_STACK PrinterInitialize(void* handle);
SDK_API int CALL_STACK FeedLine(void* handle,int lines);
SDK_API int CALL_STACK SetAlign(void* handle, int align);
SDK_API int CALL_STACK PrintText(void* handle,const TCHAR* data,int alignment,int attribute,int textSize);
SDK_API int CALL_STACK PrintTextS(void* handle,const TCHAR* data);
SDK_API int CALL_STACK PrintBarCode(void* handle,int bcType, const TCHAR* data,int width,int height,int alignment,int hriPosition);
SDK_API int CALL_STACK PrintSymbol(void* handle,int type, const TCHAR* data,int errLevel,int width,int height,int alignment);

SDK_API int CALL_STACK CutPaper(void* handle,int cutMode,int distance);
//add by wjz 20210510
SDK_API int CALL_STACK CutPaperOnly(void* handle, int cutMode);
SDK_API int CALL_STACK OpenCashDrawer(void* handle,int pinMode,int onTime,int offTime);
SDK_API int CALL_STACK SelectStandardMode(void* handle);
SDK_API int CALL_STACK SetTextLineSpace(void* handle,int lineSpace);
SDK_API int CALL_STACK SetTextBold(void* handle, int bold);
SDK_API int CALL_STACK SetTextFont(void* handle, int font);
SDK_API int CALL_STACK SelectPageMode(void* handle);
SDK_API int CALL_STACK SetPrintAreaInPageMode(void* handle,int horizontal,int vertical,int width,int height);
SDK_API int CALL_STACK CancelPrintDataInPageMode(void* handle);
SDK_API int CALL_STACK SelectPrintDirectionInPageMode(void* handle,int direction);
SDK_API int CALL_STACK SetAbsolutePrintPosition(void* handle, int position);
SDK_API int CALL_STACK SetAbsoluteVerticalPrintPositionInPageMode(void* handle,int position);
SDK_API int CALL_STACK PrintAndReturnStandardMode(void* handle);
SDK_API int CALL_STACK PositionNextLabel(void* handle);
SDK_API int CALL_STACK PrintDataInPageMode(void* handle);
SDK_API int CALL_STACK GetPrinterState(void* handle,unsigned int* printerStatus);
SDK_API int CALL_STACK SetHorizontalAndVerticalMotionUnits(void* handle, int horizontal, int vertical);
SDK_API int CALL_STACK SetCodePage(void* handle,int codepage,int type);
SDK_API int CALL_STACK SetBuzzer(void* handle,int enable);
SDK_API int CALL_STACK SetInternationalCharacter(void* handle,int characterSet);
SDK_API int CALL_STACK SetPrintSpeed(void* handle,int speed);

//Print Image

SDK_API int CALL_STACK PrintNVImageCompatible(void* handle, int imgNo, int scaleMode);
SDK_API int CALL_STACK PrintDownloadedImageCompatible(void* handle, int scaleMode);

SDK_API int CALL_STACK PrintImage(void* handle,const TCHAR* imagePath,int scaleMode);
SDK_API int CALL_STACK DefineNVImage(void* handle,const TCHAR* imagePath,unsigned char kc1,unsigned char kc2);
SDK_API int CALL_STACK PrintNVImage(void* handle,unsigned char kc1,unsigned char kc2);
SDK_API int CALL_STACK DefineDownloadedImage(void* handle,const TCHAR* imagePath,unsigned char kc1,unsigned char kc2);
SDK_API int CALL_STACK PrintDownloadedImage(void* handle, unsigned char kc1, unsigned char kc2);
SDK_API int CALL_STACK DefineBufferedImage(void* handle,const TCHAR* imagePath);
SDK_API int CALL_STACK PrintBufferedImage(void* handle);
SDK_API int CALL_STACK DeleteAllNVImages(void* handle);

SDK_API int CALL_STACK GetFirmwareVersion(void* handle,int* version,int versionLen);
SDK_API int CALL_STACK GetCashDrawerState(void* handle, int* drawerState);
SDK_API int CALL_STACK ClearBuffer(void* handle);
SDK_API int CALL_STACK PrintBitMapData(void* handle, int scaleMode, int width, int height, unsigned char* data);
SDK_API int CALL_STACK PrintTwoQRCode(void* handle, const TCHAR* data1, int width1, int hAlign1, int vAlign1, const TCHAR* data2, int width2, int hAlign2, int vAlign2);
SDK_API int CALL_STACK PrintTwoQRCodeS(void* handle, int height, TCHAR* data1, TCHAR* data2);

SDK_API int CALL_STACK DrawLine(void* handle, int xStart, int yStart, int xEnd, int yEnd, int lineWidth);
SDK_API int CALL_STACK DrawRectangle(void* handle, int xStart, int yStart, int xArea, int yArea, int lineWidth);


SDK_API int CALL_STACK FirmwareUpgrade(void* handle,const TCHAR* cFileName,const char* model,const char* ioSettings);


SDK_API int CALL_STACK GetDrawerState(void* handle, int* drawerState);
SDK_API int CALL_STACK OpenDrawer(void* handle, int pinMode, int onTime, int offTime);

//=========================== add by wjz 20210512

//请传入gbk编码的文本
SDK_API int CALL_STACK PrintReceipt(void* handle
	, int	cn_font											//中文字体
	, int	en_font											//英文字体
	, const char* licence_plate								//车牌号 + 颜色	
	, const char* entrance
	, const char* entrance_time
	, const char* exit
	, const char* exit_time
	, const char* money
	, int qrcode_width
	, int qrcode_errlevel
	, const char* qrcode
	, const char* custom_text
	, const char* phone
	, int cutMode);

//打印自检页 add by wjz 20210511
SDK_API int CALL_STACK PrintDemoPage(void* handle);

SDK_API int CALL_STACK SetEthernetInfo(void* handle, int mode, const char* ip, const char*  ipmask, const char* gateway);
SDK_API int CALL_STACK GetEthernetInfo(void* handle, int* mode, char* ip, char*  ipmask, char* gateway, char* macaddress);

//设置打印浓度
SDK_API int CALL_STACK SetDensity(void* handle, int density);
//设置切刀
SDK_API int CALL_STACK SetCutter(void* handle, int enable);
//设置蜂鸣器
SDK_API int CALL_STACK SetBuzzer2(void* handle, int buzzer);
//设置串口信息
SDK_API int CALL_STACK SetSerialportInfo(void* handle, int baudrate, int bytesize, int parity, int stopbit, int flowctrl);

//获取打印浓度
SDK_API int CALL_STACK GetDensity(void* handle, int* density);
//获取切刀
SDK_API int CALL_STACK GetCutter(void* handle, int* enable);
//获取蜂鸣器
SDK_API int CALL_STACK GetBuzzer2(void* handle, int* buzzer);
//获取串口信息
SDK_API int CALL_STACK GetSerialportInfo(void* handle, int* baudrate, int* bytesize, int* parity, int* stopbit, int* flowctrl);

//加密模块复位
SDK_API int CALL_STACK EncryptionModuleNumberReset(void* handle);

//读取加密模块编码
SDK_API int CALL_STACK GetEncryptionModuleNumber(void* handle, char* buf, int len, int* reallen);

//设置蜂鸣器音量
SDK_API int CALL_STACK SetBuzzerVolume(void* handle, int volume);

//读取蜂鸣器音量
SDK_API int CALL_STACK GetBuzzerVolume(void* handle, int* volume);

//检测纸将尽设置
SDK_API int CALL_STACK SetCheckLabelRunout(void* handle, int enable);

//设置中文字体
SDK_API int CALL_STACK SetFontCN(void* handle, int font);

SDK_API int CALL_STACK Test(void* handle);

//==========================================
//add by wjz 20211110
SDK_API int CALL_STACK PrintImageStream(void* handle, const char* stream, int len, int scaleMode);
SDK_API int CALL_STACK DefineNVImageStream(void* handle, const char* stream, int len, unsigned char kc1, unsigned char kc2);
SDK_API int CALL_STACK DefineDownloadedImageStream(void* handle, const char* stream, int len, unsigned char kc1, unsigned char kc2);
SDK_API int CALL_STACK DefineBufferedImageStream(void* handle, const char* stream, int len);

#ifndef LINUX

SDK_API int CALL_STACK DefineDownloadedImageStreamCompatible(void* handle, const char* stream, int len);
SDK_API int CALL_STACK DefineDownloadedImageCompatible(void* handle, const TCHAR* fileName);
SDK_API int CALL_STACK DefineNVImageCompatible(void* handle, const TCHAR** fileNameList, int imageQty);

#endif

//CDE-110
SDK_API int CALL_STACK SetLed(void* handle, int lightType, int mode);

SDK_API int CALL_STACK GetPrinterSN(void* handle, char* sn, int* snLenth);

//TP808S
SDK_API int CALL_STACK GetPaperFeedLinesNumber(void* handle, unsigned int *number);
SDK_API int CALL_STACK GetHeadEnergizingStrokesNumber(void* handle, unsigned int *number);
//擦除所有统计值指令1
SDK_API int CALL_STACK ClearPrinterMileage(void* handle,int clearType);
SDK_API int CALL_STACK GetAutocutterOperationsNumber(void* handle, unsigned int *number);
SDK_API int CALL_STACK GetPrinterOperationPeriod(void* handle, unsigned int *period);

//过温报错次数统计
SDK_API int CALL_STACK GetOverTemperatureErrorReportNumber(void* handle, unsigned int *number);

//打印点数的统计 
SDK_API int CALL_STACK GetPrinterPointsNumber(void* handle, unsigned int *number);

//切刀错误统计
SDK_API int CALL_STACK GetCutterErrorNumber(void* handle, unsigned int *number);

//上电开盖次数统计
SDK_API int CALL_STACK GetPowerOnOpenCoverNumber(void* handle, unsigned int *number);

//半切次数统计
SDK_API int CALL_STACK GetHalfCutNumber(void* handle, unsigned int *number);

//全切次数统计
SDK_API int CALL_STACK GetTotalCutNumber(void* handle, unsigned int *number);

//擦除所有统计值指令2
SDK_API int CALL_STACK ClearPrinterMileage2(void* handle);

#ifndef LINUX
SDK_API int CALL_STACK FirmwareOtaUpgrade(void* handle,const TCHAR* cFileName,const TCHAR* model,const TCHAR* ioSettings);

SDK_API int CALL_STACK FontDownload(void* handle,const TCHAR* cFileName,const TCHAR* model,const TCHAR* ioSettings);
#endif

SDK_API int CALL_STACK GetVersion(char* buffer, int len);

#ifdef __cplusplus
}
#endif

#endif /*WIN32_SDK_H*/
