import React from 'react';
import HeatMap from '../HeatMap'
import { withRouter } from 'react-router-dom';
import {
  Accordion,
  AccordionItem,
  AccordionItemTitle,
  AccordionItemBody,
} from 'react-accessible-accordion';
import Model from '../Model'
import OutputField from '../OutputField'
import { API_ROOT } from '../../api-config';
import { truncateText } from '../DemoInput'

const title = "Reading Comprehension"

const description = (
  <span>
    Reading comprehension is the task of answering questions about a passage of text to show that
    the system understands the passage.
  </span>
  )

const taskModels = [
  {
    name: "BiDAF (trained on SQuAD)",
    desc: "Reimplementation of BiDAF (Seo et al, 2017), or Bi-Directional Attention Flow,<br/>a widely used MC baseline that achieved state-of-the-art accuracies on<br/>the SQuAD dataset (Wikipedia sentences) in early 2017."
  },
  {
    name: "NAQANet (trained on DROP)",
    desc: "An augmented version of QANet that adds rudimentary numerical reasoning ability,<br/>trained on DROP (Dua et al., 2019), as published in the original DROP paper."
  }
]

const taskEndpoints = {
  "BiDAF (trained on SQuAD)": "reading-comprehension", // TODO: we should rename tha back-end model to reading-comprehension
  "NAQANet (trained on DROP)": "naqanet-reading-comprehension"
};

const fields = [
  {name: "passage", label: "Passage", type: "TEXT_AREA",
   placeholder: `E.g. "Saturn is the sixth planet from the Sun and the second-largest in the Solar System, after Jupiter. It is a gas giant with an average radius about nine times that of Earth. Although it has only one-eighth the average density of Earth, with its larger volume Saturn is just over 95 times more massive. Saturn is named after the Roman god of agriculture; its astronomical symbol represents the god's sickle"`},
  {name: "question", label: "Question", type: "TEXT_INPUT",
   placeholder: `E.g. "What does Saturn’s astronomical symbol represent"`},
  {name: "model", label: "Model", type: "RADIO", options: taskModels, optional: true}
]

const Attention = ({passage_question_attention, question_tokens, passage_tokens}) => {
  if(passage_question_attention && question_tokens && passage_tokens) {
    return (
        <OutputField label="Model internals">
          <Accordion accordion={false}>
            <AccordionItem expanded={false}>
              <AccordionItemTitle>
                Passage to Question attention
                <div className="accordion__arrow" role="presentation"/>
              </AccordionItemTitle>
              <AccordionItemBody>
                <p>
                  For every passage word, the model computes an attention over the question words.
                  This heatmap shows that attention, which is normalized for every row in the matrix.
                </p>
                <HeatMap
                  colLabels={question_tokens} rowLabels={passage_tokens}
                  data={passage_question_attention} includeSlider={true} showAllCols={true} />
              </AccordionItemBody>
            </AccordionItem>
          </Accordion>
        </OutputField>
    )
  }
  return null;
}

const NoAnswer = () => {
  return (
    <OutputField label="Answer">
      No answer returned.
    </OutputField>
  )
}

const MultiSpanHighlight = ({original, highlightSpans, highlightStyles}) => {
  if(original && highlightSpans && highlightStyles) {
    // assumes spans are not overlapping and in order
    let curIndex = 0;
    let spanList = [];
    highlightSpans.forEach((s, sIndex) => {
      if(s[0] > curIndex){
        // add preceding non-highlighted span
        spanList.push(<span key={`${curIndex}_${s[0]}`}>{original.slice(curIndex, s[0])}</span>);
        curIndex = s[0];
      }
      // add highlighted span
      if(s[1] > curIndex) {
        spanList.push(<span key={`${curIndex}_${s[1]}`} className={highlightStyles[sIndex]}>{original.slice(curIndex, s[1])}</span>);
        curIndex = s[1];
      }
    });
    // add last non-highlighted span
    if(curIndex < original.length) {
      spanList.push(<span key={`${curIndex}_${original.length}`}>{original.slice(curIndex)}</span>);
    }
    return (
      <span>
        {spanList.map(s=> s)}
      </span>
    )
  }
  return null;
}

const ArithmeticEquation = ({numbers}) => {
  if(numbers) {
    let ret = numbers
      .filter(n => n.sign !== 0)
      .map(n => `${n.sign > 0 ? "+" : "-"} ${n.value}`)
      .join(" ");
    while(ret.charAt(0) === "+" || ret.charAt(0) === " ") {
      ret = ret.substr(1);
    }
    return <span>{ret}</span>;
  }
  return null;
}

const AnswerByType = ({requestData, responseData}) => {
  if(requestData && responseData) {
    const { passage, question } = requestData;
    const { answer } = responseData;
    const { answer_type } = answer || {};

    switch(answer_type) {
      case "passage_span": {
        const { spans, value } = answer || {};
        if(question && passage && spans && value) {
          return (
            <section>
              <OutputField label="Answer">
                {value}
              </OutputField>

              <OutputField label="Explanation">
                The model decided the answer was in the passage.
              </OutputField>

              <OutputField label="Passage">
                <MultiSpanHighlight
                  original={passage}
                  highlightSpans={spans}
                  highlightStyles={spans.map(s => "highlight__answer")}/>
              </OutputField>

              <OutputField label="Question">
                {question}
              </OutputField>

              <Attention {...responseData}/>
            </section>
          )
        }
        return NoAnswer();
      }

      case "question_span": {
        const { spans, value } = answer || {};
        if(question && passage && spans && value) {
          return (
            <section>
              <OutputField label="Answer">
                {value}
              </OutputField>

              <OutputField label="Explanation">
                The model decided the answer was in the question.
              </OutputField>

              <OutputField label="Passage">
                {passage}
              </OutputField>

              <OutputField label="Question">
                <MultiSpanHighlight
                  original={question}
                  highlightSpans={spans}
                  highlightStyles={spans.map(s => "highlight__answer")}/>
              </OutputField>

              <Attention {...responseData}/>
            </section>
          )
        }
        return NoAnswer();
      }

      case "count": {
        const { count } = answer || {};
        if(question && passage && count !== undefined) {
          return (
            <section>
              <OutputField label="Answer">
                {count}
              </OutputField>

              <OutputField label="Explanation">
                The model decided this was a counting problem.
              </OutputField>

              <OutputField label="Passage">
                {passage}
              </OutputField>

              <OutputField label="Question">
                {question}
              </OutputField>

              <Attention {...responseData}/>
            </section>
          )
        }
        return NoAnswer();
      }

      case "arithmetic": {
        const { numbers, value } = answer || {};
        if (question && passage && numbers && value !== undefined) {
          return (
            <section>
              <OutputField label="Answer">
                {value}
              </OutputField>

              <OutputField label="Explanation">
                The model used the arithmetic expression <ArithmeticEquation numbers={numbers} /> = {value}.
              </OutputField>

              <OutputField label="Passage">
                <MultiSpanHighlight
                  original={passage}
                  highlightSpans={numbers.map(n => n.span)}
                  highlightStyles={numbers.map(n => `highlight__num_${n.sign}`)}/>
              </OutputField>

              <OutputField label="Question">
                {question}
              </OutputField>

              <Attention {...responseData}/>
            </section>
          )
        }
        return NoAnswer();
      }

      default: { // old best_span_str path used by BiDAF model
        const { best_span_str } = responseData;
        if(question && passage && best_span_str) {
          const start = passage.indexOf(best_span_str);
          const head = passage.slice(0, start);
          const tail = passage.slice(start + best_span_str.length);
          return (
            <section>
              <OutputField label="Answer">
                {best_span_str}
              </OutputField>

              <OutputField label="Passage Context">
                <span>{head}</span>
                <span className="highlight__answer">{best_span_str}</span>
                <span>{tail}</span>
              </OutputField>

              <OutputField label="Question">
                {question}
              </OutputField>

              <Attention {...responseData}/>
            </section>
          )
        }
        return NoAnswer();
      }
    }
  }
  return NoAnswer();
}

const Output = (props) => {
  return (
    <div className="model__content answer">
      <AnswerByType {...props}/>
    </div>
  )
}

const addSnippet = (example) => {
  return {...example, snippet: truncateText(example.question)}
}

const examples = [
  ['SQuAD-like Argument Finding', [
        {
          passage: "A reusable launch system (RLS, or reusable launch vehicle, RLV) is a launch system which is capable of launching a payload into space more than once. This contrasts with expendable launch systems, where each launch vehicle is launched once and then discarded. No completely reusable orbital launch system has ever been created. Two partially reusable launch systems were developed, the Space Shuttle and Falcon 9. The Space Shuttle was partially reusable: the orbiter (which included the Space Shuttle main engines and the Orbital Maneuvering System engines), and the two solid rocket boosters were reused after several months of refitting work for each launch. The external tank was discarded after each flight.",
          question: "How many partially reusable launch systems were developed?",
        },
        {
          passage: "Robotics is an interdisciplinary branch of engineering and science that includes mechanical engineering, electrical engineering, computer science, and others. Robotics deals with the design, construction, operation, and use of robots, as well as computer systems for their control, sensory feedback, and information processing. These technologies are used to develop machines that can substitute for humans. Robots can be used in any situation and for any purpose, but today many are used in dangerous environments (including bomb detection and de-activation), manufacturing processes, or where humans cannot survive. Robots can take on any form but some are made to resemble humans in appearance. This is said to help in the acceptance of a robot in certain replicative behaviors usually performed by people. Such robots attempt to replicate walking, lifting, speech, cognition, and basically anything a human can do.",
          question: "What do robots that resemble humans attempt to do?",
        },
        {
          passage: "The Matrix is a 1999 science fiction action film written and directed by The Wachowskis, starring Keanu Reeves, Laurence Fishburne, Carrie-Anne Moss, Hugo Weaving, and Joe Pantoliano. It depicts a dystopian future in which reality as perceived by most humans is actually a simulated reality called \"the Matrix\", created by sentient machines to subdue the human population, while their bodies' heat and electrical activity are used as an energy source. Computer programmer \"Neo\" learns this truth and is drawn into a rebellion against the machines, which involves other people who have been freed from the \"dream world.\"",
          question: "Who stars in The Matrix?",
        },
        {
          passage: "Kerbal Space Program (KSP) is a space flight simulation video game developed and published by Squad for Microsoft Windows, OS X, Linux, PlayStation 4, Xbox One, with a Wii U version that was supposed to be released at a later date. The developers have stated that the gaming landscape has changed since that announcement and more details will be released soon. In the game, players direct a nascent space program, staffed and crewed by humanoid aliens known as \"Kerbals\". The game features a realistic orbital physics engine, allowing for various real-life orbital maneuvers such as Hohmann transfer orbits and bi-elliptic transfer orbits.",
          question: "What does the physics engine allow for?",
        },
        {
          passage: "The institutional framework of Navarre was preserved following the 1512 invasion. Once Ferdinand II of Aragon died in January, the Parliament of Navarre gathered in Pamplona, urging Charles V  to attend a coronation ceremony in the town following tradition, but the envoys of the Parliament were met with the Emperor's utter indifference if not contempt. He refused to attend any ceremony and responded with a brief \"let's say I am happy and  pleases me.\" Eventually the Parliament met in 1517 without Charles V, represented instead by the Duke of Najera pronouncing an array of promises of little certitude, while the acting Parliament kept piling up grievances and demands for damages due to the Emperor, totalling 67—the 2nd Viceroy of Navarre Fadrique de Acuña was deposed in 1515 probably for acceding to send grievances. Contradictions inherent to the documents accounting for the Emperor's non-existent oath pledge in 1516 point to a contemporary manipulation of the records.",
          question: "Who represented the Charles V at Parliament?",
        },
      ].map(addSnippet)],

  ['Counting', [
        {
          passage: "Hoping to rebound from their loss to the Patriots, the Raiders stayed at home for a Week 16 duel with the Houston Texans.  Oakland would get the early lead in the first quarter as quarterback JaMarcus Russell completed a 20-yard touchdown pass to rookie wide receiver Chaz Schilens.  The Texans would respond with fullback Vonta Leach getting a 1-yard touchdown run, yet the Raiders would answer with kicker Sebastian Janikowski getting a 33-yard and a 30-yard field goal.  Houston would tie the game in the second quarter with kicker Kris Brown getting a 53-yard and a 24-yard field goal. Oakland would take the lead in the third quarter with wide receiver Johnnie Lee Higgins catching a 29-yard touchdown pass from Russell, followed up by an 80-yard punt return for a touchdown.  The Texans tried to rally in the fourth quarter as Brown nailed a 40-yard field goal, yet the Raiders' defense would shut down any possible attempt.",
          question: "How many touchdowns were there in the game?",
        },
        {
          passage: "Hoping to rebound from their loss to the Patriots, the Raiders stayed at home for a Week 16 duel with the Houston Texans.  Oakland would get the early lead in the first quarter as quarterback JaMarcus Russell completed a 20-yard touchdown pass to rookie wide receiver Chaz Schilens.  The Texans would respond with fullback Vonta Leach getting a 1-yard touchdown run, yet the Raiders would answer with kicker Sebastian Janikowski getting a 33-yard and a 30-yard field goal.  Houston would tie the game in the second quarter with kicker Kris Brown getting a 53-yard and a 24-yard field goal. Oakland would take the lead in the third quarter with wide receiver Johnnie Lee Higgins catching a 29-yard touchdown pass from Russell, followed up by an 80-yard punt return for a touchdown.  The Texans tried to rally in the fourth quarter as Brown nailed a 40-yard field goal, yet the Raiders' defense would shut down any possible attempt.",
          question: "How many passing touchdowns were there in the game?",
        },
        {
          passage: "In 1085, Guadalajara was retaken by the Christian forces of Alfonso VI . The chronicles say that the Christian army was led by Alvar Fanez de Minaya, one of the lieutenants  of El Cid. From 1085 until the Battle of Las    Navas de Tolosa in 1212, the city suffered wars against the Almoravid and the Almohad Empires. In spite of the wars, the Christian population could definitely settle down in the area thanks to the repopulation with people from the North  who received their first fuero in 1133 from Alfonso VII.In 1219, the king Fernando III gave a new fuero to the city .During the reign of Alfonso X of Castile, the protection of the king allowed the city to develop its economy by protecting merchants and allowing markets.",
          question: "How many empires attacked Guadalajara?",
        },
    ].map(addSnippet)],

  ['Argmax', [
        {
          passage: "Hoping to rebound from their fourth-quarter collapse to the Panthers, the Vikings flew to Soldier Field to face Jay Cutler and the Chicago Bears in a Week 16 rematch to conclude the 40th season of Monday Night Football. Due to the Saints losing to Tampa Bay 20-17 in overtime the previous day, the Vikings needed to win their last two games and have the Saints lose to Carolina the next week in order to clinch homefield advantage. In the first quarter, the Bears drew first blood as kicker Robbie Gould nailed a 22-yard field goal for the only score of the period. In the second quarter, the Bears increased their lead with Gould nailing a 42-yard field goal. They increased their lead with Cutler firing a 7-yard TD pass to tight end Greg Olsen. The Bears then closed out the first half with Gould's 41-yard field goal. In the third quarter, the Vikes started to rally with running back Adrian Peterson's 1-yard touchdown run (with the extra point attempt blocked). The Bears increased their lead over the Vikings with Cutler's 2-yard TD pass to tight end Desmond Clark. The Vikings then closed out the quarter with quarterback Brett Favre firing a 6-yard TD pass to tight end Visanthe Shiancoe. An exciting fourth quarter ensued. The Vikings started out the quarter's scoring with kicker Ryan Longwell's 41-yard field goal, along with Adrian Peterson's second 1-yard TD run. The Bears then responded with Cutler firing a 20-yard TD pass to wide receiver Earl Bennett. The Vikings then completed the remarkable comeback with Favre finding wide receiver Sidney Rice on a 6-yard TD pass on 4th-and-goal with 15 seconds left in regulation. The Bears then took a knee to force overtime. In overtime, the Bears won the toss and marched down the field, stopping at the 35-yard line. However, the potential game-winning 45-yard field goal attempt by Gould went wide right, giving the Vikings a chance to win. After an exchange of punts, the Vikings had the ball at the 26-yard line with 11 minutes left in the period. On the first play of scrimmage, Favre fired a screen pass to Peterson who caught it and went 16 yards, before being confronted by Hunter Hillenmeyer, who caused Peterson to fumble the ball, which was then recovered by Bears' linebacker Nick Roach. The Bears then won on Jay Cutler's game-winning 39-yard TD pass to wide receiver Devin Aromashodu. With the loss, not only did the Vikings fall to 11-4, they also surrendered homefield advantage to the Saints.",
          question: "Who threw the longest touchdown pass of the game?",
        },
        {
          passage: "A power outage that disrupted play in the third quarter served as a fitting metaphor for the Giants' general lack of power on the field this night. Smith was sidelined by a torn pectoral muscle suffered during practice, and backup receiver Ramses Barden saw his season come to an end during this game by way of a torn Achilles tendon. Former Giant Jason Garrett was making his head coaching debut for a Cowboys team revitalized by the firing of head coach Wade Phillips one week earlier. The Dallas defense held the Giants to just 6 points in the first half, aided by cornerback Bryan McCann's 101-yard \"pick 6\" from his own end zone. In a dimly lit third quarter, after a bank of lights went dark, Felix Jones extended the Cowboys' lead to 20 points on a 71-yard touchdown reception. Only after a total blackout caused an eight-minute play stoppage did Manning finally put the Giants' first touchdown on the board, in the form of a 5-yard pass to Manningham. The teams continued to trade touchdowns; a 24-yard pass from Kitna to Austin was followed by a 35-yard reception by Boss. But the Giants' turnover problem resurfaced in the fourth quarter, where a fumble and an interception ended up costing them any chance at a comeback.",
          question: "Who caught the shortest touchdown pass?",
        },
    ].map(addSnippet)],

  ['Max', [
        {
          passage: "Hoping to rebound from their loss to the Patriots, the Raiders stayed at home for a Week 16 duel with the Houston Texans.  Oakland would get the early lead in the first quarter as quarterback JaMarcus Russell completed a 20-yard touchdown pass to rookie wide receiver Chaz Schilens.  The Texans would respond with fullback Vonta Leach getting a 1-yard touchdown run, yet the Raiders would answer with kicker Sebastian Janikowski getting a 33-yard and a 30-yard field goal.  Houston would tie the game in the second quarter with kicker Kris Brown getting a 53-yard and a 24-yard field goal. Oakland would take the lead in the third quarter with wide receiver Johnnie Lee Higgins catching a 29-yard touchdown pass from Russell, followed up by an 80-yard punt return for a touchdown.  The Texans tried to rally in the fourth quarter as Brown nailed a 40-yard field goal, yet the Raiders' defense would shut down any possible attempt.",
          question: "How many yards was the longest passing touchdown?",
        },
        {
          passage: "A power outage that disrupted play in the third quarter served as a fitting metaphor for the Giants' general lack of power on the field this night. Smith was sidelined by a torn pectoral muscle suffered during practice, and backup receiver Ramses Barden saw his season come to an end during this game by way of a torn Achilles tendon. Former Giant Jason Garrett was making his head coaching debut for a Cowboys team revitalized by the firing of head coach Wade Phillips one week earlier. The Dallas defense held the Giants to just 6 points in the first half, aided by cornerback Bryan McCann's 101-yard \"pick 6\" from his own end zone. In a dimly lit third quarter, after a bank of lights went dark, Felix Jones extended the Cowboys' lead to 20 points on a 71-yard touchdown reception. Only after a total blackout caused an eight-minute play stoppage did Manning finally put the Giants' first touchdown on the board, in the form of a 5-yard pass to Manningham. The teams continued to trade touchdowns; a 24-yard pass from Kitna to Austin was followed by a 35-yard reception by Boss. But the Giants' turnover problem resurfaced in the fourth quarter, where a fumble and an interception ended up costing them any chance at a comeback.",
          question: "How many yards was the longest touchdown reception?",
        },
    ].map(addSnippet)],

  ['Arithmetic', [
        {
          passage: "In 1085, Guadalajara was retaken by the Christian forces of Alfonso VI . The chronicles say that the Christian army was led by Alvar Fanez de Minaya, one of the lieutenants of El Cid. From 1085 until the Battle of Las Navas de Tolosa in 1212, the city suffered wars against the Almoravid and the Almohad Empires. In spite of the wars, the Christian population could definitely settle down in the area thanks to the repopulation with people from the North  who received their first fuero in 1133 from Alfonso VII.In 1219, the king Fernando III gave a new fuero to the city .During the reign of Alfonso X of Castile, the protection of the king allowed the city to develop its economy by protecting merchants and allowing markets.",
          question: "How many years did the city suffer wars against Almoravid and the Almohad Empires?",
        },
        {
          passage: "The total number of active military personnel in the Croatian Armed Forces stands at 14,506 and 6,000 reserves working in various service branches of the armed forces. In May 2016, Armed Forces had 16,019 members, of which 14,506 were active military personnel and 1,513 civil servants. Of the 14,506 active military personnel, 3,183 were officers, 5,389 non-commissioned officers, 5,393 soldiers, 520 military specialists, 337 civil servants and 1,176 other employees.",
          question: "In May 2016, how many members of the Armed Forces were not active military personnel?",
        },
        {
          passage: "In 1905, 1,003 Korean immigrants, which included 802 men and 231 women and children, departed from the port of Chemulpo, Incheon aboard the ship Ilford to Salina Cruz, Oaxaca, Mexico. The journey took 45 days, after which they took a train to Coatzacoalcos, Veracruz. In the Veracruz port, another boat was taken to the port of Progreso with the final destination being the capital city of Mérida, Yucatan. They arrived in May 1905, with previously signed contracts for four years' work as indentured laborers on the Yucatán henequen haciendas. Many of these Koreans were distributed throughout the Yucatán in 32 henequen haciendas. The town of Motul, Yucatan, located in the heart of the henequen zone, was a destination for many of the Korean immigrants. Subsequently, in 1909, at the end of their contracts, they began a new stage in which they scattered even further  Thus, the majority of those who came were single men who made or remade their family lives with Yucatecan especially Maya women. While Korean girls were much more subject to marriages arranged by Korean parents, males had greater freedom when it came to making a family. This rapid intermarriage by Koreans, coupled with geographic dispersal, prevented the establishment of close social networks among these migrants and therefore provided the basis for Korean descendants among the Yucatan Peninsula. After that 1905 ship, no further entries of Koreans into Mexico were recorded, until many years later, leading to a new community of Koreans with completely different characteristics from those who entered in 1905. These descendants have started the Museo Conmemorativo de la Inmigración Coreana a Yucatán, a museum for the remembrance of their ancestors journey.",
          question: "How many more Korean immigrant men were there compared to women and children?",
        },
        {
          passage: "Coming off their impressive home win over the Buccaneers, the Texans stayed at home, donned their battle red alternates, and played a Thursday night intraconference duel with the Denver Broncos.  In the first quarter, Houston drew first blood as QB Sage Rosenfels got a 5-yard TD run for the only score of the period.  In the second quarter, the Broncos got on the board with kicker Jason Elam getting a 41-yard field goal.  Afterwards, the Texans responded with kicker Kris Brown getting a 41-yard field goal.  Denver would end the half as Elam nailed a 47-yard field goal. In the third quarter, Houston replied with RB Ron Dayne getting a 6-yard TD run.  Denver would answer with QB Jay Cutler completing a 12-yard TD pass to TE Tony Scheffler.  In the fourth quarter, the Texans pulled away as Rosenfels completed a 4-yard TD pass to WR Andre Johnson, while FB Vonta Leach managed to get a 1-yard TD run. With the win, Houston improved to 7-7. The game marked the only appearance of the Texans on primetime television of the season, their first since 2005, and the first game in 2007 played with the roof open.",
          question: "How many yards was the difference between the longest and shortest TD runs?"
        },
        {
          passage: "As Somalia gained military strength, Ethiopia grew weaker. In September 1974, Emperor Haile Selassie had been overthrown by the Derg , marking a period of turmoil. The Derg quickly fell into internal conflict to determine who would have primacy. Meanwhile, various anti-Derg as well as separatist movements began throughout the country. The regional balance of power now favoured Somalia. One of the separatist groups seeking to take advantage of the chaos was the pro-Somalia Western Somali Liberation Front  operating in the Somali-inhabited Ogaden area, which by late 1975 had struck numerous government outposts. From 1976 to 1977, Somalia supplied arms and other aid to the WSLF. A sign that order had been restored among the Derg was the announcement of Mengistu Haile Mariam as head of state on February 11, 1977. However, the country remained in chaos as the military attempted to suppress its civilian opponents in a period known as the Red Terror . Despite the violence, the Soviet Union, which had been closely observing developments, came to believe that Ethiopia was developing into a genuine Marxist-Leninist state and that it was in Soviet interests to aid the new regime. They thus secretly approached Mengistu with offers of aid that he accepted. Ethiopia closed the U.S. military mission and the communications centre in April 1977. In June 1977, Mengistu accused Somalia of infiltrating SNA soldiers into the Somali area to fight alongside the WSLF. Despite considerable evidence to the contrary, Barre strongly denied this, saying SNA \"volunteers\" were being allowed to help the WSLF.",
          question: "How many years after the period of turmoil for the Dergs did the announcement of Mengistu Haile Mariam as head of state take place to try and restore order?",
        },
        {
          passage: "After the Battle of Deçiq Ottoman government decided for peaceful means of suppression of the revolt because frequent clashes with Albanians attracted the attention of the  European Great Powers. On 11 June sultan Mehmed V visited Skopje where he was greeted enthusiastically by the local population together with two Albanian chieftains who swore their allegiance to the Ottoman sultan. On 15 June, the date of the Battle of Kosovo, he visited the site of the historical battle greeted by 100.000 people. During his visit to Kosovo vilayet he signed a general amnesty for all participants of the Albanian revolts of 1910 and 1911. He was welcomed by the choir of the Serbian Orthodox Seminary with Turkish songs and vice-consul Milan Rakić had gathered a large contingent of Serbs, but many Albanians boycotted the event. Ottoman representatives managed to deal with the leaders of Albanian rebels in Kosovo Vilayet and Scutari Vilayet separately, because they were not united and lacked central control. The Ottoman Empire first managed to pacify the northern Albanian malësorë  from Scutari Vilayet reaching a compromise during a meeting in Podgorica. In order to resolve the problems in the south, the Ottoman representatives invited Albanian southern leaders to a meeting in Tepelenë on 18 August 1911. They promised to meet most of their demands, like general amnesty, the opening of Albanian language schools, and the restriction that military service was to be performed only in the territory of the vilayets with substantial Albanian population.  Other demands included requiring administrative officers to learn the Albanian language, and that the possession of weapons would be permitted.",
          question: "How many days after sultan Mehmed V visited Skopje did he visit the site of the Battle of Kosovo?"
        },
        {
          passage: "The Mavericks finished 49–33, one game ahead of Phoenix for the eighth and final playoff spot, which meant that they would once again have to face their in-state rivals, the San Antonio Spurs, who were the top seed in the Western Conference with a 62–20 record. In Game 1 in San Antonio, Dallas had an 81–71 lead in the fourth quarter, but the Spurs rallied back and took Game 1, 85-90. However, the Mavs forced 22 turnovers in Game 2 to rout the Spurs 113–92, splitting the first two games before the series went to Dallas. In Game 3, Manu Ginóbili hit a shot that put the Spurs up 108–106 with 1.7 seconds left, but a buzzer-beater by Vince Carter gave the Mavs the victory, putting them up 2–1 in the series. The Spurs took Game 4 in Dallas 93–89 despite a late Dallas comeback after the Spurs at one point had a 20-point lead and later won Game 5 at home, 109–103, giving them a 3–2 series lead. The Mavs avoided elimination in Game 6 at home by rallying in the fourth quarter, winning 111–113. Game 7 was on the Spurs home court, and the Spurs beat the Mavericks 119–96, putting an end to the Mavericks season.",
          question: "How many points did the Spurs beat the Mavericks by in Game 7?"
        },
    ].map(addSnippet)],

  ['Comparison', [
        {
          passage: "The institutional framework of Navarre was preserved following the 1512 invasion. Once Ferdinand II of Aragon died in January, the Parliament of Navarre gathered in Pamplona, urging Charles V  to attend a coronation ceremony in the town following tradition, but the envoys of the Parliament were met with the Emperor's utter indifference if not contempt. He refused to attend any ceremony and responded with a brief \"let's say I am happy and  pleases me.\" Eventually the Parliament met in 1517 without Charles V, represented instead by the Duke of Najera pronouncing an array of promises of little certitude, while the acting Parliament kept piling up grievances and demands for damages due to the Emperor, totalling 67—the 2nd Viceroy of Navarre Fadrique de Acuña was deposed in 1515 probably for acceding to send grievances. Contradictions inherent to the documents accounting for the Emperor's non-existent oath pledge in 1516 point to a contemporary manipulation of the records.",
          question: "Who died first: Ferdinand II or Charles V?"
        },
        {
          passage: "Kannada language is the official language of Karnataka and spoken as a native language by about 66.54% of the people as of 2011. Other linguistic minorities in the state were Urdu (10.83%), Telugu language (5.84%), Tamil language (3.45%), Marathi language (3.38%), Hindi (3.3%), Tulu language (2.61%), Konkani language (1.29%), Malayalam (1.27%) and Kodava Takk (0.18%). In 2007 the state had a birth rate of 2.2%, a death rate of 0.7%, an infant mortality rate of 5.5% and a maternal mortality rate of 0.2%. The total fertility rate was 2.2.",
          question: "Which linguistic minority is larger, Hindi or Malayalam?"
        },
        {
          passage: "In 1905, 1,003 Korean immigrants, which included 802 men and 231 women and children, departed from the port of Chemulpo, Incheon aboard the ship Ilford to Salina Cruz, Oaxaca, Mexico. The journey took 45 days, after which they took a train to Coatzacoalcos, Veracruz. In the Veracruz port, another boat was taken to the port of Progreso with the final destination being the capital city of Mérida, Yucatan. They arrived in May 1905, with previously signed contracts for four years' work as indentured laborers on the Yucatán henequen haciendas. Many of these Koreans were distributed throughout the Yucatán in 32 henequen haciendas. The town of Motul, Yucatan, located in the heart of the henequen zone, was a destination for many of the Korean immigrants. Subsequently, in 1909, at the end of their contracts, they began a new stage in which they scattered even further  Thus, the majority of those who came were single men who made or remade their family lives with Yucatecan especially Maya women. While Korean girls were much more subject to marriages arranged by Korean parents, males had greater freedom when it came to making a family. This rapid intermarriage by Koreans, coupled with geographic dispersal, prevented the establishment of close social networks among these migrants and therefore provided the basis for Korean descendants among the Yucatan Peninsula. After that 1905 ship, no further entries of Koreans into Mexico were recorded, until many years later, leading to a new community of Koreans with completely different characteristics from those who entered in 1905. These descendants have started the Museo Conmemorativo de la Inmigración Coreana a Yucatán, a museum for the remembrance of their ancestors journey.",
          question: "Where did the immigrants arrive first, Salina Cruz or Coatzacoalcos?",
        },
        {
          passage: "In 1905, 1,003 Korean immigrants, which included 802 men and 231 women and children, departed from the port of Chemulpo, Incheon aboard the ship Ilford to Salina Cruz, Oaxaca, Mexico. The journey took 45 days, after which they took a train to Coatzacoalcos, Veracruz. In the Veracruz port, another boat was taken to the port of Progreso with the final destination being the capital city of Mérida, Yucatan. They arrived in May 1905, with previously signed contracts for four years' work as indentured laborers on the Yucatán henequen haciendas. Many of these Koreans were distributed throughout the Yucatán in 32 henequen haciendas. The town of Motul, Yucatan, located in the heart of the henequen zone, was a destination for many of the Korean immigrants. Subsequently, in 1909, at the end of their contracts, they began a new stage in which they scattered even further  Thus, the majority of those who came were single men who made or remade their family lives with Yucatecan especially Maya women. While Korean girls were much more subject to marriages arranged by Korean parents, males had greater freedom when it came to making a family. This rapid intermarriage by Koreans, coupled with geographic dispersal, prevented the establishment of close social networks among these migrants and therefore provided the basis for Korean descendants among the Yucatan Peninsula. After that 1905 ship, no further entries of Koreans into Mexico were recorded, until many years later, leading to a new community of Koreans with completely different characteristics from those who entered in 1905. These descendants have started the Museo Conmemorativo de la Inmigración Coreana a Yucatán, a museum for the remembrance of their ancestors journey.",
          question: "Where did the immigrants arrive first, Coatzacoalcos or Salina Cruz?",
        },
    ].map(addSnippet)],

  ['Coreference', [
        {
          passage: "The institutional framework of Navarre was preserved following the 1512 invasion. Once Ferdinand II of Aragon died in January, the Parliament of Navarre gathered in Pamplona, urging Charles V  to attend a coronation ceremony in the town following tradition, but the envoys of the Parliament were met with the Emperor's utter indifference if not contempt. He refused to attend any ceremony and responded with a brief \"let's say I am happy and  pleases me.\" Eventually the Parliament met in 1517 without Charles V, represented instead by the Duke of Najera pronouncing an array of promises of little certitude, while the acting Parliament kept piling up grievances and demands for damages due to the Emperor, totalling 67—the 2nd Viceroy of Navarre Fadrique de Acuña was deposed in 1515 probably for acceding to send grievances. Contradictions inherent to the documents accounting for the Emperor's non-existent oath pledge in 1516 point to a contemporary manipulation of the records.",
          question: "Who represented the Emperor at Parliament?",
        },
        {
          passage: "The institutional framework of Navarre was preserved following the 1512 invasion. Once Ferdinand II of Aragon died in January, the Parliament of Navarre gathered in Pamplona, urging Charles V  to attend a coronation ceremony in the town following tradition, but the envoys of the Parliament were met with the Emperor's utter indifference if not contempt. He refused to attend any ceremony and responded with a brief \"let's say I am happy and  pleases me.\" Eventually the Parliament met in 1517 without Charles V, represented instead by the Duke of Najera pronouncing an array of promises of little certitude, while the acting Parliament kept piling up grievances and demands for damages due to the Emperor, totalling 67—the 2nd Viceroy of Navarre Fadrique de Acuña was deposed in 1515 probably for acceding to send grievances. Contradictions inherent to the documents accounting for the Emperor's non-existent oath pledge in 1516 point to a contemporary manipulation of the records.",
          question: "Who refused to attend the ceremony?",
        },
        {
          passage: "The institutional framework of Navarre was preserved following the 1512 invasion. Once Ferdinand II of Aragon died in January, the Parliament of Navarre gathered in Pamplona, urging Charles V  to attend a coronation ceremony in the town following tradition, but the envoys of the Parliament were met with the Emperor's utter indifference if not contempt. He refused to attend any ceremony and responded with a brief \"let's say I am happy and  pleases me.\" Eventually the Parliament met in 1517 without Charles V, represented instead by the Duke of Najera pronouncing an array of promises of little certitude, while the acting Parliament kept piling up grievances and demands for damages due to the Emperor, totalling 67—the 2nd Viceroy of Navarre Fadrique de Acuña was deposed in 1515 probably for acceding to send grievances. Contradictions inherent to the documents accounting for the Emperor's non-existent oath pledge in 1516 point to a contemporary manipulation of the records.",
          question: "Where was the coronation that Charles V was supposed to attend?",
        },
    ].map(addSnippet)],

  ['Combinations', [
        {
          passage: "Hoping to rebound from their loss to the Patriots, the Raiders stayed at home for a Week 16 duel with the Houston Texans.  Oakland would get the early lead in the first quarter as quarterback JaMarcus Russell completed a 20-yard touchdown pass to rookie wide receiver Chaz Schilens.  The Texans would respond with fullback Vonta Leach getting a 1-yard touchdown run, yet the Raiders would answer with kicker Sebastian Janikowski getting a 33-yard and a 30-yard field goal.  Houston would tie the game in the second quarter with kicker Kris Brown getting a 53-yard and a 24-yard field goal. Oakland would take the lead in the third quarter with wide receiver Johnnie Lee Higgins catching a 29-yard touchdown pass from Russell, followed up by an 80-yard punt return for a touchdown.  The Texans tried to rally in the fourth quarter as Brown nailed a 40-yard field goal, yet the Raiders' defense would shut down any possible attempt.",
          question: "How many yards was the second longest passing touchdown?",
        },
        {
          passage: "Hoping to rebound from their loss to the Patriots, the Raiders stayed at home for a Week 16 duel with the Houston Texans.  Oakland would get the early lead in the first quarter as quarterback JaMarcus Russell completed a 20-yard touchdown pass to rookie wide receiver Chaz Schilens.  The Texans would respond with fullback Vonta Leach getting a 1-yard touchdown run, yet the Raiders would answer with kicker Sebastian Janikowski getting a 33-yard and a 30-yard field goal.  Houston would tie the game in the second quarter with kicker Kris Brown getting a 53-yard and a 24-yard field goal. Oakland would take the lead in the third quarter with wide receiver Johnnie Lee Higgins catching a 29-yard touchdown pass from Russell, followed up by an 80-yard punt return for a touchdown.  The Texans tried to rally in the fourth quarter as Brown nailed a 40-yard field goal, yet the Raiders' defense would shut down any possible attempt.",
          question: "Who kicked the most field goals?",
        },
        {
          passage: "1% of those at school in the South-East gained no GCSE passes in 2010; Portsmouth was most with 2.5%, and Windsor and Maidenhead had the lowest with 0.2%. For school free school meals, the region has the lowest percentage in England with 7.2%; the highest percentage is Southampton with 17%, and the lowest is Wokingham with 3.5% (the second lowest in England after Rutland); Buckinghamshire is 4.3%, then Bracknell Forest and Surrey are 4.9%. For truancy, the highest is South Bucks at 7.0, then Canterbury 7.0, Portsmouth 6.9, Thanet 6.9, Southampton 6.4, and Rushmoor 6.1. The lowest truancy percentages are for Tandridge 2.5, Windsor & Maidenhead 2.5, and Slough 2.5.",
          question: "Which areas are tied for the highest truancy rates?",
        },
    ].map(addSnippet)],

]

const apiUrl = ({model}) => {
  const selectedModel = model || (taskModels[0] && taskModels[0].name);
  const endpoint = taskEndpoints[selectedModel]
  return `${API_ROOT}/predict/${endpoint}`
}

const modelProps = {apiUrl, title, description, fields, examples, Output}

export default withRouter(props => <Model {...props} {...modelProps}/>)
