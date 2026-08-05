Imports System.Collections.Generic
Namespace Demo.Printer
    Public Class Constants
        ' C Library Return Result  
#Region "Commond Error"
        ' operation success
        'Dim iCount 

        Public Const E_SUCCESS As Integer = 0
        Public Const E_INVALID_PARAMETER As Integer = -1
        Public Const E_NO_ENOUGH_BUFFER As Integer = -2
        Public Const E_INVALID_MODEL_TYPE As Integer = -3
        Public Const E_NOT_SUPPORT As Integer = -4
        Public Const E_PORT_NOT_OPEN As Integer = -5
        Public Const E_BAD_HANDLE As Integer = -6
        Public Const E_NOT_IMPLEMENTED As Integer = -7
        Public Const E_INVALID_MODEL As Integer = -8
        Public Const E_NOT_ENOUGH_MEMORY As Integer = -9
        Public Const E_BASE As Integer = -100
        ' IO Error
        ' io setting error
        Public Const E_IO_ERROR As Integer = -300
        Public Const E_IO_INVALID_SETTING As Integer = -301
        Public Const E_IO_NAME_TOO_LONG As Integer = -302
        Public Const E_IO_OS_VERSION_TOO_LOW As Integer = -304
        Public Const E_IO_INVALID_HANDLE As Integer = -308
        Public Const E_IO_PORT_NOT_OPEN As Integer = -309

        Public Const E_PORT_ALREADY_OPEN As Integer = -310
        ' io open error
        Public Const E_IO_PORT_OPEN_FAILED As Integer = -311

        Public Const E_IO_GETATTR_ERROR As Integer = -312
        Public Const E_IO_SETATTR_ERROR As Integer = -313

        Public Const E_IO_WRITE_FAILED As Integer = -321
        Public Const E_IO_WRITE_TIMEOUT As Integer = -322

        Public Const E_IO_READ_FAILED As Integer = -331
        Public Const E_IO_READ_TIMEOUT As Integer = -332

        Public Const E_IO_FLUSH_FAILED As Integer = -341

        Public Const E_IO_SERIAL_INVALID_BAUDRATE As Integer = -351
        Public Const E_IO_SERIAL_INVALID_HANDSHAKE As Integer = -352
        ' USB port error 
        Public Const E_IO_INVALID_USB_PATH As Integer = -371
        Public Const E_IO_USB_DEVICE_NOT_FOUND As Integer = -372
        Public Const E_IO_USB_DEVICE_BUSY As Integer = -373

        Public Const E_IO_LIBUSB_E_START As Integer = -1100
        Public Const E_IO_LIBUSB_E_END As Integer = -1200

        Public Const E_LIBUSB_SUCCESS As Integer = -1101

        Public Const E_LIBUSB_ERROR_IO As Integer = -1102

        Public Const E_LIBUSB_ERROR_INVALID_PARAM As Integer = -1103

        Public Const E_LIBUSB_ERROR_ACCESS As Integer = -1104

        Public Const E_LIBUSB_ERROR_NO_DEVICE As Integer = -1105

        Public Const E_LIBUSB_ERROR_NOT_FOUND As Integer = -1106

        Public Const E_LIBUSB_ERROR_BUSY As Integer = -1107

        Public Const E_LIBUSB_ERROR_TIMEOUT As Integer = -1108

        Public Const E_LIBUSB_ERROR_OVERFLOW As Integer = -1109

        Public Const E_LIBUSB_ERROR_PIPE As Integer = -1110

        Public Const E_LIBUSB_ERROR_INTERRUPTED As Integer = -1111

        Public Const E_LIBUSB_ERROR_NO_MEM As Integer = -1112

        Public Const E_LIBUSB_ERROR_NOT_SUPPORTED As Integer = -1113

        Public Const E_LIBUSB_ERROR_OTHER As Integer = -1199

        ' Card - Encrypt Head Error
        ' msr track
        Public Const E_MSR_TRACK_NOT_READY As Integer = -401
        ' smard card
        Public Const E_SMART_CARD_NOT_READY As Integer = -411
        'encrypt head
        Public Const E_EH_SET_ERROR As Integer = -501
        Public Const E_EH_DECRYPT_ERROR As Integer = -511
#End Region

#Region "Printer Command Class"
        'Printer Command Class
        ' first byte
        Public Const C_ESC As Integer = 1
        Public Const C_TSC As Integer = 2
        ' second byte
        'status mode 2 : example PT541,PT562,PT1561
        Public Const C_STAT_2 As Integer = &H100
        'status mode 3 : example TP 801/805/806
        Public Const C_STAT_3 As Integer = &H200
        Public Const C_USBADV As Integer = &H1000
        Public Const C_CMDPKG As Integer = &H2000

        Public Const C_UNKNOWN As Integer = -1

        ' usb ctl command
        Public Const USB_CTRL_RESET As Integer = 1
        Public Const USB_CTRL_GET_STATUS As Integer = 2

        'GS Mode
        Public Const GS_MODE As Integer = 0
#End Region

#Region "类型定义"
        'Text Align
        Public Shared ReadOnly ALIGNMENT_LEFT As Integer = 0
        Public Shared ReadOnly ALIGNMENT_CENTER As Integer = 1
        Public Shared ReadOnly ALIGNMENT_RIGHT As Integer = 2
        Public Shared ReadOnly ALIGNMENT_TOP As Integer = 0
        Public Shared ReadOnly ALIGNMENT_BOTTOM As Integer = 2

        'BarCode Type
        Public Shared ReadOnly BARCODE_UPC_A As Integer = 65
        Public Shared ReadOnly BARCODE_UPC_E As Integer = 66
        Public Shared ReadOnly BARCODE_EAN13 As Integer = 67
        Public Shared ReadOnly BARCODE_JAN13 As Integer = 67
        Public Shared ReadOnly BARCODE_EAN8 As Integer = 68
        Public Shared ReadOnly BARCODE_JAN8 As Integer = 68
        Public Shared ReadOnly BARCODE_CODE39 As Integer = 69
        Public Shared ReadOnly BARCODE_ITF As Integer = 70
        Public Shared ReadOnly BARCODE_CODABAR As Integer = 71
        Public Shared ReadOnly BARCODE_CODE93 As Integer = 72
        Public Shared ReadOnly BARCODE_CODE128 As Integer = 73
        Public Shared ReadOnly SYMBOL_STANDARD_PDF417 As Integer = 101
        Public Shared ReadOnly SYMBOL_TRUNCATED_PDF417 As Integer = 102
        Public Shared ReadOnly SYMBOL_QRCODE1 As Integer = 103
        Public Shared ReadOnly SYMBOL_QRCODE2 As Integer = 104
        'Cut Paper Mode
        Public Shared ReadOnly FULL_CUT As Integer = 0
        Public Shared ReadOnly PARTIAL_CUT As Integer = 1
        'PDF417 Code error correction level
        Public Shared ReadOnly PDF417_ERROR_SET_LEVEL As Integer = 48
        Public Shared ReadOnly PDF417_ERROR_SET_RATIO As Integer = 49

        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_0 As Integer = 48
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_1 As Integer = 49
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_2 As Integer = 50
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_3 As Integer = 51
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_4 As Integer = 52
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_5 As Integer = 53
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_6 As Integer = 54
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_7 As Integer = 55
        Public Shared ReadOnly PDF417_ERROR_CORRECTION_LEVEL_8 As Integer = 56

        'QR Code error correction level
        Public Shared ReadOnly QRCODE_ERROR_CORRECTION_LEVEL_L As Integer = 48
        Public Shared ReadOnly QRCODE_ERROR_CORRECTION_LEVEL_M As Integer = 49
        Public Shared ReadOnly QRCODE_ERROR_CORRECTION_LEVEL_Q As Integer = 50
        Public Shared ReadOnly QRCODE_ERROR_CORRECTION_LEVEL_H As Integer = 51
        'Symbol model
        Public Shared ReadOnly SYMBOL_MODEL_1 As Integer = 49
        Public Shared ReadOnly SYMBOL_MODEL_2 As Integer = 50
        'Text Font
        Public Shared ReadOnly TEXT_FONT_A As Integer = 0
        Public Shared ReadOnly TEXT_FONT_B As Integer = 1
        Public Shared ReadOnly TEXT_FONT_C As Integer = 2
        'Text Size
        Public Shared ReadOnly TEXT_SIZE_0WIDTH As Integer = 0
        Public Shared ReadOnly TEXT_SIZE_1WIDTH As Integer = 16
        Public Shared ReadOnly TEXT_SIZE_2WIDTH As Integer = 32
        Public Shared ReadOnly TEXT_SIZE_3WIDTH As Integer = 48
        Public Shared ReadOnly TEXT_SIZE_4WIDTH As Integer = 64
        Public Shared ReadOnly TEXT_SIZE_5WIDTH As Integer = 80
        Public Shared ReadOnly TEXT_SIZE_6WIDTH As Integer = 96
        Public Shared ReadOnly TEXT_SIZE_7WIDTH As Integer = 112

        Public Shared ReadOnly TEXT_SIZE_0HEIGHT As Integer = 0
        Public Shared ReadOnly TEXT_SIZE_1HEIGHT As Integer = 1
        Public Shared ReadOnly TEXT_SIZE_2HEIGHT As Integer = 2
        Public Shared ReadOnly TEXT_SIZE_3HEIGHT As Integer = 3
        Public Shared ReadOnly TEXT_SIZE_4HEIGHT As Integer = 4
        Public Shared ReadOnly TEXT_SIZE_5HEIGHT As Integer = 5
        Public Shared ReadOnly TEXT_SIZE_6HEIGHT As Integer = 6
        Public Shared ReadOnly TEXT_SIZE_7HEIGHT As Integer = 7

        ' Print Text Styles
        Public Shared ReadOnly TEXT_NORMAL_MODE As Integer = 0
        Public Shared ReadOnly TEXT_FONT_BOLD As Integer = 2
        Public Shared ReadOnly TEXT_FONT_UNDERLINE_MODE As Integer = 4
        Public Shared ReadOnly TEXT_FONT_REVERSE As Integer = 8
        Public Shared ReadOnly TEXT_FONT_DH_MODE As Integer = 16
        Public Shared ReadOnly TEXT_FONT_DW_MODE As Integer = 32
        Public Shared ReadOnly TEXT_FONT_DW_DH_MODE As Integer = 48

        ' Print HRI Position 
        Public Shared ReadOnly BARCODE_HRI_NONE As Integer = 0
        Public Shared ReadOnly BARCODE_HRI_ABOVE As Integer = 1
        Public Shared ReadOnly BARCODE_HRI_BELOW As Integer = 2
        Public Shared ReadOnly BARCODE_HRI_BOTH As Integer = 3
        'Print HRI Font
        Public Shared ReadOnly BARCODE_HRI_FONT_A As Integer = 0
        Public Shared ReadOnly BARCODE_HRI_FONT_B As Integer = 1
        'Select print direction in page mode 
        Public Shared ReadOnly PRINT_DIRECTION_LEFT_TO_RIGHT As Integer = 0
        Public Shared ReadOnly PRINT_DIRECTION_BOTTOM_TO_TOP As Integer = 1
        Public Shared ReadOnly PRINT_DIRECTION_RIGHT_TO_LEFT As Integer = 2
        Public Shared ReadOnly PRINT_DIRECTION_TOP_TO_BOTTOM As Integer = 3
        'Bit Image Mode
        Public Shared ReadOnly BITIMAGE_8DOT_SINGLE_DENSITY As Integer = 0
        Public Shared ReadOnly BITIMAGE_8DOT_DOUBLE_DENSITY As Integer = 1
        Public Shared ReadOnly BITIMAGE_24DOT_SINGLE_DENSITY As Integer = 32
        Public Shared ReadOnly BITIMAGE_24DOT_DOUBLE_DENSITY As Integer = 33
        'Print Image Mode
        Public Shared ReadOnly PRINT_IMAGE_NORMAL As Integer = 0
        Public Shared ReadOnly PRINT_IMAGE_DOUBLE_WIDTH As Integer = 1
        Public Shared ReadOnly PRINT_IMAGE_DOUBLE_HEIGHT As Integer = 2
        Public Shared ReadOnly PRINT_IMAGE_QUADRUPLE As Integer = 3

        'Printer Status
        Public Shared ReadOnly STS_NORMAL As Integer = 0
        Public Shared ReadOnly STS_PAPEREMPTY As Integer = 1
        Public Shared ReadOnly STS_COVEROPEN As Integer = 2
        Public Shared ReadOnly STS_PAPERNEAREND As Integer = 4
        Public Shared ReadOnly STS_MSR_READY As Integer = 8
        Public Shared ReadOnly STS_SMARTCARD_READY As Integer = 16
        Public Shared ReadOnly STS_ERROR As Integer = 32
        Public Shared ReadOnly STS_NOT_OPEN As Integer = 64
        Public Shared ReadOnly STS_OFFLINE As Integer = 128
        'Character Code Table
        Public Shared ReadOnly CHARACTERSET_DEFAULT As Integer = 0
        Public Shared ReadOnly CHARACTERSET_USA As Integer = 437
        Public Shared ReadOnly CHARACTERSET_MULTILINGUAL As Integer = 850
        Public Shared ReadOnly CHARACTERSET_PORTUGUESE As Integer = 860
        Public Shared ReadOnly CHARACTERSET_CANADIAN_FRENCH As Integer = 863
        Public Shared ReadOnly CHARACTERSET_NORDIC As Integer = 865
        Public Shared ReadOnly CHARACTERSET_WPC1252 As Integer = 1252
        Public Shared ReadOnly CHARACTERSET_CYRILLIC2 As Integer = 866
        Public Shared ReadOnly CHARACTERSET_LATIN2 As Integer = 852
        Public Shared ReadOnly CHARACTERSET_EURO As Integer = 858

        'Card Type
        Public Shared ReadOnly MSRCARDTYPE_NONE As Integer = 0
        Public Shared ReadOnly MSRCARDTYPE_MAGNETICCARD As Integer = 1
        Public Shared ReadOnly MSRCARDTYPE_SMARTCARD As Integer = 2
        'MSR Read TrackNo Option
        Public Shared ReadOnly TRACK_FULL As Integer = 0
        Public Shared ReadOnly TRACK_NO_1 As Integer = 1
        Public Shared ReadOnly TRACE_NO_2 As Integer = 2
        Public Shared ReadOnly TRACE_NO_3 As Integer = 3
        Public Shared ReadOnly TRACE_NO_1_2 As Integer = 4
        'Smart Card Operation
        Public Shared ReadOnly SMARTCARD_POWERDOWN As Integer = 17
        Public Shared ReadOnly SMARTCARD_POWERUP As Integer = 18
        Public Shared ReadOnly SMARTCARD_GETDATA As Integer = 19
        Public Shared ReadOnly SMARTCARD_SENDDATA As Integer = 20
        Public Shared ReadOnly SMARTCARD_APDU As Integer = 21
        'CashDrawer
        Public Shared ReadOnly CASH_DRAWER_1 As Integer = 0
        Public Shared ReadOnly CASH_DRAWER_2 As Integer = 1
        '          Print Drawer Time Mode*/
        Public Shared ReadOnly DRAWER_ON_TIME_100 As Integer = 100
        Public Shared ReadOnly DRAWER_ON_TIME_200 As Integer = 200
        Public Shared ReadOnly DRAWER_ON_TIME_300 As Integer = 300
        Public Shared ReadOnly DRAWER_ON_TIME_400 As Integer = 400
        Public Shared ReadOnly DRAWER_ON_TIME_500 As Integer = 500
        Public Shared ReadOnly DRAWER_ON_TIME_600 As Integer = 600
        Public Shared ReadOnly DRAWER_ON_TIME_700 As Integer = 700
        Public Shared ReadOnly DRAWER_ON_TIME_800 As Integer = 800
        'Encrypt Head
        Public Shared ReadOnly EH_FIX As Integer = &H30
        Public Shared ReadOnly EH_DUKPT As Integer = &H31
        Public Shared ReadOnly EH_DISABLE As Integer = &H30
        Public Shared ReadOnly EH_ENABLE As Integer = &H31
        Public Shared ReadOnly EH_NONE As Integer = &H30
        Public Shared ReadOnly EH_3DES As Integer = &H31
        Public Shared ReadOnly EH_AES As Integer = &H32
#End Region

#Region "Printer Name" '          1:  ESC Printers */

        Public Const MODEL_UNKNOWN As Integer = 0
        Public Const MODEL_INVALID As Integer = -1

        Public Const MODEL_MAX As Integer = 31
#End Region

    End Class

End Namespace


'----------------------------------------------------------------
