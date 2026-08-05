unit frmSample;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes, Vcl.Graphics,
  Vcl.Controls, Vcl.Forms, Vcl.Dialogs, Vcl.StdCtrls,PrinterLib, Vcl.ComCtrls,
  Vcl.ExtDlgs, Vcl.Buttons;

type
  Tfrm_Sample = class(TForm)
    grpConfig: TGroupBox;
    cbbModel: TComboBox;
    lblModel: TLabel;
    lblPort: TLabel;
    cbbPortType: TComboBox;
    edtPortSetting: TEdit;
    btnConnect: TButton;
    btnStop: TButton;
    pgcFunction: TPageControl;
    tsReceipt: TTabSheet;
    tsQRCode: TTabSheet;
    lblAlignment: TLabel;
    lblWidth: TLabel;
    lblData: TLabel;
    cbbAlignment: TComboBox;
    cbbWidth: TComboBox;
    edtData: TEdit;
    btnPrint: TButton;
    redtReceipt: TRichEdit;
    btnPrintReceipt: TButton;
    tsImage: TTabSheet;
    grpPrintImage: TGroupBox;
    grpPrintNVImage: TGroupBox;
    btnPrintImage: TButton;
    btnPrintNVImage: TButton;
    btnSelectNVImage: TButton;
    dlgOpenPic1: TOpenPictureDialog;
    TabSheet1: TTabSheet;
    Button1: TButton;
    procedure btnConnectClick(Sender: TObject);
    procedure btnStopClick(Sender: TObject);
    procedure PrintQRCode();
    procedure btnPrintClick(Sender: TObject);
    procedure edtDataKeyDown(Sender: TObject; var Key: Word;
      Shift: TShiftState);
    procedure cbbPortTypeSelect(Sender: TObject);
    procedure btnPrintReceiptClick(Sender: TObject);
    function SetBtnEnable(Enable:Boolean):Integer;
    procedure btnPrintImageClick(Sender: TObject);
    procedure btnSelectNVImageClick(Sender: TObject);
    procedure btnPrintNVImageClick(Sender: TObject);
    procedure Button1Click(Sender: TObject);

  private
    { Private declarations }
  public
    { Public declarations }

  end;


var
  frm_Sample: Tfrm_Sample;
  bDownloaded:Boolean = False;
  printer:Pointer;
  errorNo:Integer=0;


implementation

{$R *.dfm}


procedure Tfrm_Sample.btnConnectClick(Sender: TObject);
var
  errNo :Integer;
  modelSetting:Ansistring;
  portSetting:Ansistring;
begin
  errNo := E_SUCCESS;
  modelSetting := cbbModel.Text;
  portSetting :=  edtPortSetting.Text;

  if(E_SUCCESS = PrinterCreator(@printer, modelSetting))then
  begin
   if(errNo<>PortOpen(printer, portSetting))then
   begin
      MessageDlg('Port Failed!',mtWarning,[mbOK],0);
   end
   else
   begin
     SetBtnEnable(True);
   end;
  end
  else
  begin
    MessageDlg('Creator Model Failed!',mtWarning,[mbOK],0);
  end;

end;

procedure Tfrm_Sample.btnPrintClick(Sender: TObject);
begin
  PrintQRCode();
end;

procedure Tfrm_Sample.btnPrintImageClick(Sender: TObject);
var
  Image:ansistring;
begin
  if dlgOpenPic1.Execute then
  begin
     Image := dlgOpenPic1.FileName;
     PrintImage(printer, Image,0);
  end;

end;

procedure Tfrm_Sample.btnPrintNVImageClick(Sender: TObject);
begin
  PrintNVImageCompatible(printer, 1,PRINT_IMAGE_NORMAL);
end;

procedure Tfrm_Sample.btnPrintReceiptClick(Sender: TObject);
var
  text:string;
begin
  text := redtReceipt.Text;
  PrintText(printer, text,0,0,0);
  CutPaper(printer, FULL_CUT,5);
end;

procedure Tfrm_Sample.btnSelectNVImageClick(Sender: TObject);
var
  ImageList:array[0..10] of Ansistring;
  errNO:Integer;
begin
  if dlgOpenPic1.Execute then
  begin
     ImageList[0] := dlgOpenPic1.FileName;
     errNO:=DefineNVImageCompatible(printer, ImageList,1);
     if E_SUCCESS = errNO then
     begin
        MessageDlg('Download image succeed!',mtWarning,[mbOK],0);
     end
     else
     begin
        MessageDlg(Format('Download image failed,Error Code:%d!',[errNO]),mtWarning,[mbOK],0);
     end;
  end;
end;

procedure Tfrm_Sample.btnStopClick(Sender: TObject);
begin
   PortClose(printer);
   SetBtnEnable(False);
end;


procedure Tfrm_Sample.Button1Click(Sender: TObject);
var
  readNum:Integer;
  result:Integer;
  clearType:Integer;
  strEndInfomation: string;
begin
  result := 1;
  result := GetPaperFeedLinesNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Paper Feed Lines Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Paper Feed Lines Number fail = ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetHeadEnergizingStrokesNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Head Energizing Strokes Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Head Energizing Strokes Number fail = ' + IntToStr(result) + #13#10
  end;

  //result := 1;
  //clearType := 0;
  //result := ClearPrinterMileage(printer,clearType);
  //if result=0 then
//  begin
//    strEndInfomation := strEndInfomation + 'Clear Printing Mileage success ' +  #13#10
//  end
//  else
//  begin
//    strEndInfomation := strEndInfomation + 'Clear Printing Mileage success fail ' + #13#10
//  end;

  result := 1;
  result := GetAutocutterOperationsNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Autocutter Operations Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Autocutter Operations Number fail = ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetPrinterOperationPeriod(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Printer Operation Period = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Printer Operation Period fail =  ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetOverTemperatureErrorReportNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Over Temperature Error Report Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Over Temperature Error Report Number fail =   ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetPrinterPointsNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Printer Points Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Printer Points Number fail =   ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetCutterErrorNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Cutter Error Number = ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Cutter Error Number fail = ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetPowerOnOpenCoverNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Power On Open Cover Number =  ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Power On Open Cover Number fail = ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetHalfCutNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Half Cut Number =   ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Half Cut Number fail =  ' + IntToStr(result) + #13#10
  end;

  result := 1;
  result := GetTotalCutNumber(printer,@readNum);
  if result=0 then
  begin
    strEndInfomation := strEndInfomation + 'Get Total Cut Number =  ' + IntToStr(readNum) + #13#10
  end
  else
  begin
    strEndInfomation := strEndInfomation + 'Get Total Cut Number fail =   ' + IntToStr(result) + #13#10
  end;

//  result := 1;
//  result := ClearPrinterMileage2(printer);
//  if result=0 then
//  begin
//    strEndInfomation := strEndInfomation + 'Clear Printing Mileage2 success ' +  #13#10
//  end
//  else
//  begin
//    strEndInfomation := strEndInfomation + 'Clear Printing Mileage2 success fail ' + #13#10
//  end;

  ShowMessage(strEndInfomation);
end;

procedure Tfrm_Sample.cbbPortTypeSelect(Sender: TObject);
var
  portType:string;
begin
  portType := cbbPortType.Text;
  if('COM'=portType)then
  begin
    edtPortSetting.Text :='COM1,BAUDRATE_115200';
  end
  else if ('NET'=portType) then
  begin
    edtPortSetting.Text :='Net,192.168.1.37';
  end
  else if ('USB'=portType) then
  begin
    edtPortSetting.Text :='USB';
  end
  else if ('LPT'=portType) then
  begin
    edtPortSetting.Text :='LPT1';
  end
  else
  begin
    edtPortSetting.Text :='Invalid';
  end;
end;

procedure Tfrm_Sample.edtDataKeyDown(Sender: TObject; var Key: Word;
  Shift: TShiftState);
begin
  if(key=13)then
  begin
    PrintQRCode();
  end;
end;

procedure Tfrm_Sample.PrintQRCode();
var
  width:Integer;
  alignment:Integer;
begin
  width:= strtoint(cbbWidth.Text);
  alignment:=cbbAlignment.ItemIndex;
  if(Trim(edtData.Text)='') then
  begin
    MessageDlg('QR code data is empty!',mtWarning,[mbOK],0);
    Exit;
  end;
  PrintSymbol(printer, SYMBOL_QRCODE2, edtData.Text, 48, width,0,alignment);
end;

function Tfrm_Sample.SetBtnEnable(Enable:Boolean):Integer;
begin
  btnPrint.Enabled := Enable;
  btnStop.Enabled := Enable;
  btnPrintReceipt.Enabled := Enable;
  btnPrintImage.Enabled := Enable;
  btnSelectNVImage.Enabled := Enable;
  btnPrintNVImage.Enabled := Enable;
  btnConnect.Enabled := not Enable;
end;
end.
