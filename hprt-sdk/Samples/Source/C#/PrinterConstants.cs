using System.Collections.Generic;
namespace Printer.SDK.API
{
    public static class Constants
    {
        // C Library Return Result  
    #region Commond Error
        // operation success
        public const int E_SUCCESS = 0;
        public const int E_INVALID_PARAMETER                = -1;
        public const int E_NO_ENOUGH_BUFFER                 = -2;
        public const int E_INVALID_MODEL_TYPE               = -3;
        public const int E_NOT_SUPPORT				        = -4;
        public const int E_PORT_NOT_OPEN				    = -5;
        public const int E_BAD_HANDLE                       = -6;
        public const int E_NOT_IMPLEMENTED                  = -7;
        public const int E_INVALID_MODEL                    = -8;
        public const int E_NOT_ENOUGH_MEMORY                = -9;
        public const int E_BASE                             = -100;
        // IO Error
        /* io setting error */
        public const int E_IO_ERROR                         = -300;
        public const int E_IO_INVALID_SETTING			    = -301; 
        public const int E_IO_NAME_TOO_LONG				    = -302;
        public const int E_IO_OS_VERSION_TOO_LOW		    = -304;
        public const int E_IO_INVALID_HANDLE			    = -308;
        public const int E_IO_PORT_NOT_OPEN                 = -309;
        public const int E_PORT_ALREADY_OPEN                = -310;
        /* io open error */
        public const int E_IO_PORT_OPEN_FAILED              = -311;
        /* io attr get/set error */
        public const int E_IO_GETATTR_ERROR				    = -312;
        public const int E_IO_SETATTR_ERROR                 = -313;
        /* io write error */
        public const int E_IO_WRITE_FAILED                  = -321;
        public const int E_IO_WRITE_TIMEOUT                 = -322;
        /* io read error */
        public const int E_IO_READ_FAILED                   = -331;
        public const int E_IO_READ_TIMEOUT                  = -332;
        /* io flush error */
        public const int E_IO_FLUSH_FAILED				    = -341;
        /* serial port error */
        public const int E_IO_SERIAL_INVALID_BAUDRATE	    = -351;
        public const int E_IO_SERIAL_INVALID_HANDSHAKE      = -352;
        // USB port error 
        public const int E_IO_INVALID_USB_PATH	            = -371;
        public const int E_IO_USB_DEVICE_NOT_FOUND	        = -372;
        public const int E_IO_USB_DEVICE_BUSY	            = -373;
        /* Extern LIBUSB error */
        public const int E_IO_LIBUSB_E_START	            = -1100;
        public const int E_IO_LIBUSB_E_END	                = -1200;
        /* Success (no error) */
        public const int E_LIBUSB_SUCCESS                   = -1101;
        /* Input/output error */
        public const int E_LIBUSB_ERROR_IO                  = -1102;
        /* Invalid parameter */
        public const int E_LIBUSB_ERROR_INVALID_PARAM       = -1103;
        /** Access denied (insufficient permissions) */
        public const int E_LIBUSB_ERROR_ACCESS              = -1104;
        /* No such device (it may have been disconnected) */
        public const int E_LIBUSB_ERROR_NO_DEVICE           = -1105;
        /* Entity not found */
        public const int E_LIBUSB_ERROR_NOT_FOUND           = -1106;
        /* Resource busy */
        public const int E_LIBUSB_ERROR_BUSY                = -1107;
        /* Operation timed out */
        public const int E_LIBUSB_ERROR_TIMEOUT             = -1108;
        /* Overflow */
        public const int E_LIBUSB_ERROR_OVERFLOW            = -1109;
        /* Pipe error */
        public const int E_LIBUSB_ERROR_PIPE                = -1110;
        /* System call interrupted (perhaps due to signal) */
        public const int E_LIBUSB_ERROR_INTERRUPTED         = -1111;
        /* Insufficient memory */
        public const int E_LIBUSB_ERROR_NO_MEM              = -1112;
        /* Operation not supported or unimplemented on this platform */
        public const int E_LIBUSB_ERROR_NOT_SUPPORTED       = -1113;
        /* Other error */
        public const int E_LIBUSB_ERROR_OTHER               = -1199;

        // Card - Encrypt Head Error
        // msr track
        public const int E_MSR_TRACK_NOT_READY			    = -401;
        // smard card
        public const int E_SMART_CARD_NOT_READY			    = -411;
        //encrypt head
        public const int E_EH_SET_ERROR				        = -501;
        public const int E_EH_DECRYPT_ERROR                 = -511;
    #endregion
    #region Printer Command Class
        //Printer Command Class
        // first byte
        public const int C_ESC				                = 1;
        public const int C_TSC				                = 2;
        // second byte
        //status mode 2 : example PT541,PT562,PT1561
        public const int C_STAT_2			                = 0x0100;
        //status mode 3 : example TP 801/805/806
        public const int C_STAT_3			                = 0x0200;
        public const int C_USBADV                           = 0x1000;
        public const int C_CMDPKG                           = 0x2000;
        public const int C_UNKNOWN                          = -1;
        
        // usb ctl command
        public const int USB_CTRL_RESET                     = 1;
        public const int USB_CTRL_GET_STATUS                = 2;
        
        //GS Mode
        public const int GS_MODE                            = 0;
    #endregion
    #region 类型定义
        //Text Align
        public static readonly int ALIGNMENT_LEFT = 0;
        public static readonly int ALIGNMENT_CENTER = 1;
        public static readonly int ALIGNMENT_RIGHT = 2;
        public static readonly int ALIGNMENT_TOP = 0;
        public static readonly int ALIGNMENT_BOTTOM = 2;

        //BarCode Type
        public static readonly int BARCODE_UPC_A = 65;
        public static readonly int BARCODE_UPC_E = 66;
        public static readonly int BARCODE_EAN13 = 67;
        public static readonly int BARCODE_JAN13 = 67;
        public static readonly int BARCODE_EAN8 = 68;
        public static readonly int BARCODE_JAN8 = 68;
        public static readonly int BARCODE_CODE39 = 69;
        public static readonly int BARCODE_ITF = 70;
        public static readonly int BARCODE_CODABAR = 71;
        public static readonly int BARCODE_CODE93 = 72;
        public static readonly int BARCODE_CODE128 = 73;
        public static readonly int SYMBOL_STANDARD_PDF417 = 101;
        public static readonly int SYMBOL_TRUNCATED_PDF417 = 102;
        public static readonly int SYMBOL_QRCODE1 = 103;
        public static readonly int SYMBOL_QRCODE2 = 104;
        //Cut Paper Mode
        public static readonly int FULL_CUT = 0;
        public static readonly int PARTIAL_CUT = 1;
        //PDF417 Code error correction level
        public static readonly int PDF417_ERROR_SET_LEVEL = 48;
        public static readonly int PDF417_ERROR_SET_RATIO = 49;

        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_0 = 48;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_1 = 49;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_2 = 50;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_3 = 51;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_4 = 52;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_5 = 53;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_6 = 54;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_7 = 55;
        public static readonly int PDF417_ERROR_CORRECTION_LEVEL_8 = 56;
        
        //QR Code error correction level
        public static readonly int QRCODE_ERROR_CORRECTION_LEVEL_L = 48;
        public static readonly int QRCODE_ERROR_CORRECTION_LEVEL_M = 49;
        public static readonly int QRCODE_ERROR_CORRECTION_LEVEL_Q = 50;
        public static readonly int QRCODE_ERROR_CORRECTION_LEVEL_H = 51;
        //Symbol model
        public static readonly int SYMBOL_MODEL_1 = 49;
        public static readonly int SYMBOL_MODEL_2 = 50;
        //Text Font
        public static readonly int TEXT_FONT_A = 0;
        public static readonly int TEXT_FONT_B = 1;
        //Text Size
        public static readonly int TEXT_SIZE_0WIDTH = 0;
        public static readonly int TEXT_SIZE_1WIDTH = 16;
        public static readonly int TEXT_SIZE_2WIDTH = 32;
        public static readonly int TEXT_SIZE_3WIDTH = 48;
        public static readonly int TEXT_SIZE_4WIDTH = 64;
        public static readonly int TEXT_SIZE_5WIDTH = 80;
        public static readonly int TEXT_SIZE_6WIDTH = 96;
        public static readonly int TEXT_SIZE_7WIDTH = 112;

        public static readonly int TEXT_SIZE_0HEIGHT = 0;
        public static readonly int TEXT_SIZE_1HEIGHT = 1;
        public static readonly int TEXT_SIZE_2HEIGHT = 2;
        public static readonly int TEXT_SIZE_3HEIGHT = 3;
        public static readonly int TEXT_SIZE_4HEIGHT = 4;
        public static readonly int TEXT_SIZE_5HEIGHT = 5;
        public static readonly int TEXT_SIZE_6HEIGHT = 6;
        public static readonly int TEXT_SIZE_7HEIGHT = 7;

        // Print Text Styles
        public static readonly int TEXT_NORMAL_MODE = 0;
        public static readonly int TEXT_FONT_EMPHASIZED = 2;
        public static readonly int TEXT_FONT_UNDERLINE_MODE = 4;
        public static readonly int TEXT_FONT_REVERSE = 8;
        public static readonly int TEXT_FONT_DH_MODE = 16;
        public static readonly int TEXT_FONT_DW_MODE = 32;
        public static readonly int TEXT_FONT_DW_DH_MODE = 48;

        // Print HRI Position 
        public static readonly int BARCODE_HRI_NONE = 0;
        public static readonly int BARCODE_HRI_ABOVE = 1;
        public static readonly int BARCODE_HRI_BELOW = 2;
        public static readonly int BARCODE_HRI_BOTH = 3;
        //Print HRI Font
        public static readonly int BARCODE_HRI_FONT_A = 0;
        public static readonly int BARCODE_HRI_FONT_B = 1;
        //Select print direction in page mode 
        public static readonly int PRINT_DIRECTION_LEFT_TO_RIGHT = 0;
        public static readonly int PRINT_DIRECTION_BOTTOM_TO_TOP = 1;
        public static readonly int PRINT_DIRECTION_RIGHT_TO_LEFT = 2;
        public static readonly int PRINT_DIRECTION_TOP_TO_BOTTOM = 3;
        //Bit Image Mode
        public static readonly int BITIMAGE_8DOT_SINGLE_DENSITY = 0;
        public static readonly int BITIMAGE_8DOT_DOUBLE_DENSITY = 1;
        public static readonly int BITIMAGE_24DOT_SINGLE_DENSITY = 32;
        public static readonly int BITIMAGE_24DOT_DOUBLE_DENSITY = 33;
        //Print Image Mode
        public static readonly int PRINT_IMAGE_NORMAL		    = 0;
        public static readonly int PRINT_IMAGE_DOUBLE_WIDTH	    = 1;
        public static readonly int PRINT_IMAGE_DOUBLE_HEIGHT    = 2;
        public static readonly int PRINT_IMAGE_QUADRUPLE        = 3;

        //Printer Status
        public static readonly int STS_NORMAL = 0;
        public static readonly int STS_PAPEREMPTY = 1;
        public static readonly int STS_COVEROPEN = 2;
        public static readonly int STS_PAPERNEAREND = 4;
        public static readonly int STS_MSR_READY = 8;
        public static readonly int STS_SMARTCARD_READY = 16;
        public static readonly int STS_ERROR = 32;
        public static readonly int STS_NOT_OPEN = 64;
        public static readonly int STS_OFFLINE = 128;
        //Character Code Table
        public static readonly int CHARACTERSET_DEFAULT         = 0;
        public static readonly int CHARACTERSET_USA             = 437;
        public static readonly int CHARACTERSET_MULTILINGUAL    = 850;
        public static readonly int CHARACTERSET_PORTUGUESE      = 860;
        public static readonly int CHARACTERSET_CANADIAN_FRENCH = 863;
        public static readonly int CHARACTERSET_NORDIC          = 865;
        public static readonly int CHARACTERSET_WPC1252         = 1252;
        public static readonly int CHARACTERSET_CYRILLIC2       = 866;
        public static readonly int CHARACTERSET_LATIN2          = 852;
        public static readonly int CHARACTERSET_EURO            = 858;

        //Card Type
        public static readonly int MSRCARDTYPE_NONE = 0;
        public static readonly int MSRCARDTYPE_MAGNETICCARD = 1;
        public static readonly int MSRCARDTYPE_SMARTCARD = 2;
        //MSR Read TrackNo Option
        public static readonly int TRACK_FULL = 0;
        public static readonly int TRACK_NO_1 = 1;
        public static readonly int TRACE_NO_2 = 2;
        public static readonly int TRACE_NO_3 = 3;
        public static readonly int TRACE_NO_1_2 = 4;
        //Smart Card Operation
        public static readonly int SMARTCARD_POWERDOWN = 17;
        public static readonly int SMARTCARD_POWERUP = 18;
        public static readonly int SMARTCARD_GETDATA = 19;
        public static readonly int SMARTCARD_SENDDATA = 20;
        public static readonly int SMARTCARD_APDU = 21;
        //CashDrawer
        public static readonly int CASH_DRAWER_1 = 0;
        public static readonly int CASH_DRAWER_2 = 1;

        /* Print Drawer Time Mode*/
        public static readonly int DRAWER_ON_TIME_100   = 100;
        public static readonly int DRAWER_ON_TIME_200   = 200;
        public static readonly int DRAWER_ON_TIME_300   = 300;
        public static readonly int DRAWER_ON_TIME_400   = 400;
        public static readonly int DRAWER_ON_TIME_500   = 500;
        public static readonly int DRAWER_ON_TIME_600   = 600;
        public static readonly int DRAWER_ON_TIME_700   = 700;
        public static readonly int DRAWER_ON_TIME_800   = 800;
        //Encrypt Head
        public static readonly int EH_FIX = 0x30;
        public static readonly int EH_DUKPT = 0x31;
        public static readonly int EH_DISABLE = 0x30;
        public static readonly int EH_ENABLE = 0x31;
        public static readonly int EH_NONE = 0x30;
        public static readonly int EH_3DES = 0x31;
        public static readonly int EH_AES = 0x32;
    #endregion
    #region Printer Name
        /* 1:  ESC Printers */
        /* TP Series Receipt Printers */
        public const int MODEL_TP801		                = 0x1001;    /* 3" Thermal Receipt Printer */
        public const int MODEL_TP805		                = 0x1002;    /* 3" Thermal Receipt Printer */
        public const int MODEL_TP806		                = 0x1003;    /* 3" Thermal Receipt Printer */
        public const int MODEL_DT210		                = 0x1006 ;   /* 3" Thermal Receipt Printer( Without Cutter) only for Dascom */
        /* PPT Series Receipt Printers */
        public const int MODEL_PPT2_A		                = 0x1011 ;   /* 2" Thermal Receipt Printer */
        public const int MODEL_PPT2_UR	                    = 0x1012 ;   /* 2" Thermal Receipt Printer */
        /* PPT  Dot-matrix Printers */
        public const int MODEL_PPTD3		                = 0x1021 ;   /* 3" Dot-matrix Printer */
        /* 11: Mobile Printers */
        public const int MODEL_MPT2     	                = 0x1101;    /* 2" Mobile Receipt Printer */
        public const int MODEL_MPT3                         = 0x1102;    /* 3" Mobile Receipt Printer */
        public const int MODEL_MLP2                         = 0x1103 ;   /* 2" Mobile Label Printer   */
        public const int MODEL_MPS3     	                = 0x1104 ;   /* 3" Mobile Receipt Printer */
        /* Mobile Dot-matrix Printers */
        public const int MODEL_MPD2     	                = 0x1131 ;   /* 2" Mobile Dot-matrix Printer */
        /* Mobile Receipt Printers with special fuctions */
        public const int MODEL_MPT_E2	                    = 0x1151;    /* 2" Mobile Receipt Printer with card reader */
        /* Mobile Office Printers */
        public const int MODEL_MPT8	                        = 0x1191;   /* MPT8 A4 Mobile Thermal Transfer Printer */
        /* 15: PT Control Board */
        public const int MODEL_PT541                        = 0x1541;   /* 2" Receipt Print Control Board */
        public const int MODEL_PT562                        = 0x1562;   /* 2" Label Print Control Board */

        /* 2: Printers (ZPL Support) */

        /* 9: Other Printers */
        /* 91: TSC Label Printers */
        public const int MODEL_LP1062   	                = 0x9101;    /* 106mm Thermal Label Printer, Support TSC  */
        /* 96~99: Special Printers */
        public const int MODEL_LPQ58    	                = 0x9601;   /* 2" Thermal Receipt/Label Printer, Support ESC & TSC */
        public const int MODEL_LPQ80    	                = 0x9602;   /* 3" Thermal Receipt/Label Printer, Support ESC & TSC  */

        public const int MODEL_UNKNOWN                      = 0;
        public const int MODEL_INVALID                      = -1;

        public const int MODEL_MAX                          = 31;
    #endregion

    }

}