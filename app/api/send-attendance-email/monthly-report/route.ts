import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      type,
      parentEmail,
      studentName,
      date,
      status,
      month,
      totalClasses,
      presentCount,
      absentCount,
      attendancePercentage,
      attendanceDetails,
    } = body;

    // =====================================================
    // DAILY ABSENCE EMAIL
    // =====================================================

    if (!type || type === "daily-absence") {
      if (
        !parentEmail ||
        !studentName ||
        !date ||
        !status
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Missing email information.",
          },
          { status: 400 }
        );
      }

      // Send email only when student is absent
      if (status !== "absent") {
        return NextResponse.json({
          success: true,
          message: "No email required.",
        });
      }

      const { data, error } =
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "onboarding@resend.dev",

          to: [parentEmail],

          subject:
            `Attendance Alert - ${studentName}`,

          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">

              <h2 style="color: #581c87;">
                Jayam Institute - Attendance Alert
              </h2>

              <p>Dear Parent,</p>

              <p>
                Your child
                <strong>${studentName}</strong>
                did not attend the tuition today.
              </p>

              <p>
                <strong>Date:</strong> ${date}
              </p>

              <p>
                <strong>Status:</strong>
                <span style="color: #dc2626;">
                  Absent
                </span>
              </p>

              <p>
                Please contact the tuition centre if you
                have any questions.
              </p>

              <p>
                Regards,<br />
                <strong>Jayam Institute</strong>
              </p>

            </div>
          `,
        });

      if (error) {
        console.error(
          "Resend error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message: "Resend failed.",
            error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Attendance email sent successfully.",
        data,
      });
    }

    // =====================================================
    // MONTHLY ATTENDANCE REPORT
    // =====================================================

    if (type === "monthly-report") {
      if (
        !parentEmail ||
        !studentName ||
        !month
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Missing monthly report information.",
          },
          { status: 400 }
        );
      }

      const details =
        Array.isArray(attendanceDetails)
          ? attendanceDetails
          : [];

      const attendanceRows =
        details.length > 0
          ? details
              .map(
                (record: {
                  date: string;
                  status: string;
                }) => `
                  <tr>
                    <td style="
                      padding: 10px;
                      border: 1px solid #ddd;
                    ">
                      ${record.date}
                    </td>

                    <td style="
                      padding: 10px;
                      border: 1px solid #ddd;
                      color: ${
                        record.status === "present"
                          ? "#16a34a"
                          : "#dc2626"
                      };
                      font-weight: bold;
                    ">
                      ${
                        record.status === "present"
                          ? "Present"
                          : "Absent"
                      }
                    </td>
                  </tr>
                `
              )
              .join("")
          : `
              <tr>
                <td
                  colspan="2"
                  style="padding: 15px; text-align: center;"
                >
                  No attendance records found.
                </td>
              </tr>
            `;

      const { data, error } =
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "onboarding@resend.dev",

          to: [parentEmail],

          subject:
            `Monthly Attendance Report - ${studentName} - ${month}`,

          html: `
            <div style="
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #222;
            ">

              <h2 style="color: #581c87;">
                Jayam Institute
              </h2>

              <h3>
                Monthly Attendance Report
              </h3>

              <p>
                Dear Parent,
              </p>

              <p>
                Please find below the attendance
                report for your child.
              </p>

              <div style="
                background: #f5f3ff;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
              ">

                <p>
                  <strong>Student:</strong>
                  ${studentName}
                </p>

                <p>
                  <strong>Month:</strong>
                  ${month}
                </p>

                <p>
                  <strong>Total Classes:</strong>
                  ${totalClasses ?? 0}
                </p>

                <p style="color: #16a34a;">
                  <strong>Present:</strong>
                  ${presentCount ?? 0}
                </p>

                <p style="color: #dc2626;">
                  <strong>Absent:</strong>
                  ${absentCount ?? 0}
                </p>

                <p style="font-size: 20px;">
                  <strong>Attendance:</strong>
                  ${attendancePercentage ?? 0}%
                </p>

              </div>

              <h3>
                Attendance Details
              </h3>

              <table
                style="
                  width: 100%;
                  border-collapse: collapse;
                "
              >
                <thead>
                  <tr>
                    <th style="
                      padding: 10px;
                      border: 1px solid #ddd;
                      text-align: left;
                    ">
                      Date
                    </th>

                    <th style="
                      padding: 10px;
                      border: 1px solid #ddd;
                      text-align: left;
                    ">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${attendanceRows}
                </tbody>
              </table>

              <p style="margin-top: 25px;">
                Regards,<br />
                <strong>Jayam Institute</strong>
              </p>

            </div>
          `,
        });

      if (error) {
        console.error(
          "Monthly report Resend error:",
          error
        );

        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to send monthly report.",
            error,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Monthly attendance report sent successfully.",
        data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid email type.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Email API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to send email.",
      },
      { status: 500 }
    );
  }
}