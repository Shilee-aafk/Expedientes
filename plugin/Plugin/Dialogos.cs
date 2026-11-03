using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Windows.Forms;
using ExpedientesSPR.Nucleo;

namespace ExpedientesSPR
{
    /// <summary>Ventanas simples (WinForms) para entrar y elegir el expediente.</summary>
    static class Dialogos
    {
        static readonly Font Fuente = new Font("Segoe UI", 10f);

        static Form Ventana(string titulo, int ancho, int alto) => new Form
        {
            Text = titulo,
            ClientSize = new Size(ancho, alto),
            FormBorderStyle = FormBorderStyle.FixedDialog,
            StartPosition = FormStartPosition.CenterScreen,
            MaximizeBox = false,
            MinimizeBox = false,
            ShowInTaskbar = false,
            Font = Fuente,
        };

        /// <summary>Pide usuario y contraseña de la app. Devuelve null si se cancela.</summary>
        public static (string usuario, string clave)? Ingresar(string usuarioAnterior)
        {
            using (var f = Ventana("Expedientes SPR · Ingresar", 340, 200))
            {
                var info = new Label { Text = "Usa el mismo usuario y contraseña de la app.", Left = 16, Top = 12, Width = 310, Height = 22 };
                var lu = new Label { Text = "Usuario", Left = 16, Top = 44, Width = 90 };
                var tu = new TextBox { Left = 110, Top = 40, Width = 214, Text = usuarioAnterior ?? "" };
                var lc = new Label { Text = "Contraseña", Left = 16, Top = 82, Width = 90 };
                var tc = new TextBox { Left = 110, Top = 78, Width = 214, UseSystemPasswordChar = true };
                var ok = new Button { Text = "Ingresar", Left = 138, Top = 140, Width = 90, DialogResult = DialogResult.OK };
                var no = new Button { Text = "Cancelar", Left = 234, Top = 140, Width = 90, DialogResult = DialogResult.Cancel };
                f.Controls.AddRange(new Control[] { info, lu, tu, lc, tc, ok, no });
                f.AcceptButton = ok;
                f.CancelButton = no;
                f.Shown += (s, e) => (string.IsNullOrEmpty(tu.Text) ? tu : tc).Focus();
                if (Autodesk.AutoCAD.ApplicationServices.Application.ShowModalDialog(f) != DialogResult.OK) return null;
                if (string.IsNullOrWhiteSpace(tu.Text) || tc.Text.Length == 0) return null;
                return (tu.Text.Trim(), tc.Text);
            }
        }

        /// <summary>Lista de expedientes con buscador. Devuelve el elegido o null.</summary>
        public static ExpedienteResumen ElegirExpediente(List<ExpedienteResumen> lista, long? actual)
        {
            using (var f = Ventana("Expedientes SPR · Elegir expediente", 460, 420))
            {
                var buscar = new TextBox { Left = 16, Top = 14, Width = 428 };
                var cue = new Label { Text = "Buscar por código, predio o comuna", Left = 16, Top = 40, Width = 428, ForeColor = Color.Gray };
                var lb = new ListBox { Left = 16, Top = 64, Width = 428, Height = 300, IntegralHeight = false };
                var ok = new Button { Text = "Elegir", Left = 258, Top = 376, Width = 90, DialogResult = DialogResult.OK };
                var no = new Button { Text = "Cancelar", Left = 354, Top = 376, Width = 90, DialogResult = DialogResult.Cancel };
                void Filtrar()
                {
                    var q = buscar.Text.Trim();
                    lb.BeginUpdate();
                    lb.Items.Clear();
                    foreach (var x in lista.Where(x => q.Length == 0 || x.ToString().IndexOf(q, StringComparison.CurrentCultureIgnoreCase) >= 0))
                        lb.Items.Add(x);
                    lb.EndUpdate();
                    var sel = lb.Items.Cast<ExpedienteResumen>().ToList().FindIndex(x => x.Id == actual);
                    if (lb.Items.Count > 0) lb.SelectedIndex = sel >= 0 ? sel : 0;
                }
                buscar.TextChanged += (s, e) => Filtrar();
                buscar.KeyDown += (s, e) =>
                {
                    if (e.KeyCode == Keys.Down && lb.SelectedIndex < lb.Items.Count - 1) { lb.SelectedIndex++; e.Handled = true; }
                    if (e.KeyCode == Keys.Up && lb.SelectedIndex > 0) { lb.SelectedIndex--; e.Handled = true; }
                };
                lb.DoubleClick += (s, e) => { if (lb.SelectedItem != null) { f.DialogResult = DialogResult.OK; f.Close(); } };
                f.Controls.AddRange(new Control[] { buscar, cue, lb, ok, no });
                f.AcceptButton = ok;
                f.CancelButton = no;
                Filtrar();
                if (Autodesk.AutoCAD.ApplicationServices.Application.ShowModalDialog(f) != DialogResult.OK) return null;
                return lb.SelectedItem as ExpedienteResumen;
            }
        }
    }
}
