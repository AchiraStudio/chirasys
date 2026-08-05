using System;

using System.Collections.Generic;
using System.Windows.Forms;

namespace Printer.SDK.API
{
    static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThreadAttribute]
        static void Main()
        {
            Application.Run(new PrtWinDemo.PrtWinDemoForm());
        }
    }
}