unit PrinterLib;

interface

function PrinterCreator(printer: PPointer;model:Ansistring): Integer; stdcall ; external 'ESC_SDK.dll';
function PrinterDestroy(printer: PPointer): Integer; stdcall ; external 'ESC_SDK.dll';
function PortOpen(printer: Pointer;portSetting:Ansistring): Integer; stdcall ; external 'ESC_SDK.dll';
function PortClose(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrinterInitialize(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function FeedLine(printer:Pointer;lines:integer): Integer;stdcall ; external 'ESC_SDK.dll';
function PrintText(printer:Pointer;data:Ansistring;alignment:integer;attribute:integer;textSize:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrintBarCode(printer:Pointer;bcType:integer;data:Ansistring;width:integer;height:integer;alignment:integer;hriPosition:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrintSymbol(printer:Pointer;symbolType:integer;symbolData:Ansistring;errLevel:Integer;width:Integer;height:Integer;alignment:Integer):Integer;stdcall ; external 'ESC_SDK.dll';
function CutPaper(printer:Pointer;cutMode:integer;distance:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function OpenCashDrawer(printer:Pointer;pin_mode:integer;onTime:integer;offTime:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SelectStandardMode(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetTextLineSpace(printer:Pointer;lineSpace:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetTextPosition(printer:Pointer;position:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SelectPageMode(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetPrintAreaInPageMode(printer:Pointer;horizontal:integer;vertical:integer;width:integer;height:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function CancelPrintDataInPageMode(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function SelectPrintDirectionInPageMode(printer:Pointer;direction:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetAbsolutePrintPosition(printer:Pointer;position:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetAbsoluteVerticalPrintPositionInPageMode(printer:Pointer;position:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function SetPrintAndReturnStandardMode(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function PositionNextLabel(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrintDataInPageMode(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';
function GetPrinterState(printer:Pointer;printerStatus:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function DirectIO(printer:Pointer;writeData:PByte;writeNum:integer;readData:PByte;readNum:integer;preadedNum:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function SetCharacterSet(printer:Pointer;characterSet:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrintImage(printer:Pointer;imagePath:ansistring;scaleMode:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function DefineNVImageCompatible(printer:Pointer;imagePathList:array of Ansistring;imageQty:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function PrintNVImageCompatible(printer:Pointer;imgNo:integer;scaleMode:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function GetFirmwareVersion(printer:Pointer;version:PInteger;versionLen:integer): Integer; stdcall ; external 'ESC_SDK.dll';

function ReadData(printer:Pointer;readData:PByte;readNum:integer;preadedNum:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function WriteData(printer:Pointer;writeData:PByte;writeNum:integer): Integer; stdcall ; external 'ESC_SDK.dll';
function GetPaperFeedLinesNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetHeadEnergizingStrokesNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function ClearPrinterMileage(printer:Pointer;clearType:Integer): Integer; stdcall ; external 'ESC_SDK.dll';
function GetAutocutterOperationsNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetPrinterOperationPeriod(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetOverTemperatureErrorReportNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetPrinterPointsNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetCutterErrorNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetPowerOnOpenCoverNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetHalfCutNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function GetTotalCutNumber(printer:Pointer;readData:PInteger): Integer; stdcall ; external 'ESC_SDK.dll';
function ClearPrinterMileage2(printer:Pointer): Integer; stdcall ; external 'ESC_SDK.dll';


var
//Alignment
ALIGNMENT_LEFT:Integer=0;
ALIGNMENT_CENTER:Integer=1;
ALIGNMENT_RIGHT:Integer=2;
//QR Code Type
SYMBOL_QRCODE1:Integer=103;
SYMBOL_QRCODE2:Integer=104;
//Image ScaleMode
PRINT_IMAGE_NORMAL:Integer=0;
PRINT_IMAGE_DOUBLE_WIDTH:Integer=1;
PRINT_IMAGE_DOUBLE_HEIGHT:Integer=2;
PRINT_IMAGE_QUADRUPLE:Integer=3;
//Cut Paper
FULL_CUT :Integer = 0 ;
PARTIAL_CUT : Integer = 1 ;
//Error Code
E_SUCCESS:Integer=0;
E_BAD_HANDLE:Integer=-6;
//printer

implementation
end.
