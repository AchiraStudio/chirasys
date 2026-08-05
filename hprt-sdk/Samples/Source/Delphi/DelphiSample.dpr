program DelphiSample;

uses
  Vcl.Forms,
  frmSample in 'frmSample.pas' {frm_Sample},
  PrinterLib in 'PrinterLib.pas';

{$R *.res}

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;
  Application.CreateForm(Tfrm_Sample, frm_Sample);
  Application.Run;
end.
