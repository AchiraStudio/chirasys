object frm_Sample: Tfrm_Sample
  Left = 0
  Top = 0
  BorderIcons = [biSystemMenu, biMinimize]
  Caption = 'Sample'
  ClientHeight = 355
  ClientWidth = 407
  Color = clBtnFace
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -13
  Font.Name = 'Tahoma'
  Font.Style = []
  OldCreateOrder = False
  Position = poScreenCenter
  PixelsPerInch = 96
  TextHeight = 16
  object grpConfig: TGroupBox
    Left = 8
    Top = 8
    Width = 391
    Height = 89
    Caption = 'Configuration'
    Font.Charset = DEFAULT_CHARSET
    Font.Color = clWindowText
    Font.Height = -13
    Font.Name = 'Tahoma'
    Font.Style = []
    ParentFont = False
    TabOrder = 0
    object lblModel: TLabel
      Left = 16
      Top = 24
      Width = 39
      Height = 16
      Caption = 'Model:'
    end
    object lblPort: TLabel
      Left = 127
      Top = 24
      Width = 28
      Height = 16
      Caption = 'Port:'
    end
    object cbbModel: TComboBox
      Left = 61
      Top = 18
      Width = 57
      Height = 24
      ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
      TabOrder = 0
      Text = 'TP806'
    end
    object cbbPortType: TComboBox
      Left = 162
      Top = 18
      Width = 54
      Height = 24
      ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
      TabOrder = 1
      Text = 'USB'
      OnSelect = cbbPortTypeSelect
      Items.Strings = (
        'USB'
        'COM'
        'LPT'
        'NET')
    end
    object edtPortSetting: TEdit
      Left = 222
      Top = 18
      Width = 155
      Height = 24
      ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
      TabOrder = 2
      Text = 'USB'
    end
    object btnConnect: TButton
      Left = 143
      Top = 51
      Width = 75
      Height = 25
      Caption = 'Connect'
      TabOrder = 3
      OnClick = btnConnectClick
    end
    object btnStop: TButton
      Left = 286
      Top = 51
      Width = 75
      Height = 25
      Caption = 'Stop'
      Enabled = False
      TabOrder = 4
      OnClick = btnStopClick
    end
  end
  object pgcFunction: TPageControl
    Left = 8
    Top = 103
    Width = 391
    Height = 244
    ActivePage = tsImage
    TabOrder = 1
    object tsReceipt: TTabSheet
      Caption = 'Receipt'
      object redtReceipt: TRichEdit
        Left = 3
        Top = 3
        Width = 370
        Height = 176
        Font.Charset = GB2312_CHARSET
        Font.Color = clWindowText
        Font.Height = -13
        Font.Name = 'Tahoma'
        Font.Style = []
        ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
        Lines.Strings = (
          'RAZAO SOCIAL DA EMPESA'
          'ENDERECO'
          'CIDADE - B.H MINAS GERAIS'
          'CNPJ: 00.000.000/0000-00'
          'IE: 000.0000000.0000'
          '------------------------------------------------'
          '11/10/2014  13:35:49  CNF:350714      COD:503297  '
          '------------------------------------------------'
          '                 CUPOM n'#227'o FISCAL '
          ' '
          'ITEM CODIGO        DESCRI'#199#195'O '
          '   QTD.   UN.    VL.UNIT(R$)    ST   VL ITEM(R$) '
          '------------------------------------------------'
          '01   7898939332407 CASTANHA DE CAJU '
          '      2     UN           8,98      A       17,96   '
          '02   7891700019880 MAIONESE  '
          '     250Kg  UN           3,29      A        3,29'
          '03   2000000023455 MACA NAC. VERMELHA'
          '     1.430  KG  x        2,98      A        4,26'
          '02   7891700019880 MAIONESE '
          '     250Kg  UN           3,29      A        3,29'
          '03   2000000023455 MACA NAC. VERMELHA'
          '     1.430  KG  x        2,98      A        4,26'
          '02   7891700019880 MAIONESE  '
          '     250Kg  UN           3,29      A        3,29'
          '03   2000000023455 MACA NAC. VERMELHA'
          '     1.430  KG  x        2,98      A        4,26'
          '------------------------------------------------'
          'TOTAL R$                                   25,51 '
          'DINHEIRO                                   30,00'
          'TROCO R$                                    4,49'
          '------------------------------------------------'
          'OP: 25414  MARIA DA SILVA'
          'PARA TROCA/DEVOLUCAO DE MERCADORIAS E'
          'OBRIGATORIO APRESENTACAO DESTE CUPOM.'
          '-------------------------------------------------'
          'DADOS DE ENTREGA: HORARIO: DE 17:00 AS 21:00'
          'NOME: MARIA  SILVA'
          'RUA TESTE, 150 - MARIAS'
          'FONE:(31)0000-0000 - BELO HORIZONTE - MG'
          '-------------------------------------------------')
        ParentFont = False
        TabOrder = 0
        Zoom = 100
      end
      object btnPrintReceipt: TButton
        Left = 139
        Top = 185
        Width = 75
        Height = 25
        Caption = 'print'
        Enabled = False
        TabOrder = 1
        OnClick = btnPrintReceiptClick
      end
    end
    object tsQRCode: TTabSheet
      Caption = 'QRCode'
      ImageIndex = 1
      object lblAlignment: TLabel
        Left = 14
        Top = 14
        Width = 62
        Height = 16
        Caption = 'Alignment:'
      end
      object lblWidth: TLabel
        Left = 214
        Top = 14
        Width = 38
        Height = 16
        Caption = 'Width:'
      end
      object lblData: TLabel
        Left = 14
        Top = 41
        Width = 31
        Height = 16
        Caption = 'Data:'
      end
      object cbbAlignment: TComboBox
        Left = 88
        Top = 8
        Width = 93
        Height = 24
        ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
        ItemIndex = 0
        TabOrder = 0
        Text = 'Left'
        Items.Strings = (
          'Left'
          'Centered'
          'Right')
      end
      object cbbWidth: TComboBox
        Left = 265
        Top = 8
        Width = 110
        Height = 24
        ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
        TabOrder = 1
        Text = '3'
        Items.Strings = (
          '1'
          '2'
          '3'
          '4'
          '5'
          '6'
          '7'
          '8'
          '9'
          '10')
      end
      object edtData: TEdit
        Left = 88
        Top = 38
        Width = 287
        Height = 24
        ImeName = #20013#25991'('#31616#20307') - '#25628#29399#25340#38899#36755#20837#27861
        TabOrder = 2
        Text = 'This is print QR symbol Demo.'
        OnKeyDown = edtDataKeyDown
      end
      object btnPrint: TButton
        Left = 139
        Top = 121
        Width = 75
        Height = 25
        Caption = 'Print'
        Enabled = False
        TabOrder = 3
        OnClick = btnPrintClick
      end
    end
    object tsImage: TTabSheet
      Caption = 'Image'
      ImageIndex = 2
      object grpPrintImage: TGroupBox
        Left = 12
        Top = 3
        Width = 357
        Height = 94
        Caption = 'Print Image'
        TabOrder = 0
        object btnPrintImage: TButton
          Left = 127
          Top = 40
          Width = 94
          Height = 25
          Hint = 'No more than 576 x 900 pixel.'
          Caption = 'Print'
          Enabled = False
          TabOrder = 0
          OnClick = btnPrintImageClick
        end
      end
      object grpPrintNVImage: TGroupBox
        Left = 12
        Top = 103
        Width = 357
        Height = 94
        Caption = 'Print NV Image'
        TabOrder = 1
        object btnPrintNVImage: TButton
          Left = 222
          Top = 40
          Width = 94
          Height = 25
          Hint = 'No more than 576 x 900 pixel.'
          Caption = 'Print'
          Enabled = False
          TabOrder = 0
          OnClick = btnPrintNVImageClick
        end
        object btnSelectNVImage: TButton
          Left = 31
          Top = 40
          Width = 94
          Height = 25
          Caption = 'Select Image'
          Enabled = False
          TabOrder = 1
          OnClick = btnSelectNVImageClick
        end
      end
    end
    object TabSheet1: TTabSheet
      Caption = 'get_Number'
      ImageIndex = 3
      object Button1: TButton
        Left = 139
        Top = 80
        Width = 75
        Height = 25
        Caption = 'get_Number'
        TabOrder = 0
        OnClick = Button1Click
      end
    end
  end
  object dlgOpenPic1: TOpenPictureDialog
    Left = 288
    Top = 165
  end
end
